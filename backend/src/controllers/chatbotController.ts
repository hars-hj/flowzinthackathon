import Groq from 'groq-sdk';
import type { Request, Response } from 'express';
import { supabase } from '../../lib/supabaseClient.js';

const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = (process.env.MODEL || 'openai/gpt-oss-120b').trim();

interface ConversationRow {
  id: string;
  session_id: string;
  role: string;
  message: string;
  timestamp: string;
  sentiment: string | null;
  escalated: boolean | null;
}

function buildGroqRequestBody(history: Array<{ role: string; content: string }>, message: string) {
  return {
    model: MODEL,
    messages: [
      ...history,
      {
        role: 'user',
        content: message,
      },
    ],
  };
}

async function getLastSessionMessages(session_id: string) {
  const { data, error } = await supabase
    .from<ConversationRow>('conversations')
    .select('id, session_id, role, message, timestamp, sentiment, escalated')
    .eq('session_id', session_id)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse();
}

async function storeConversationMessage(
  session_id: string,
  role: string,
  message: string,
  sentiment: string | null = null,
  escalated: boolean | null = null,
) {
  const { error } = await supabase.from('conversations').insert([
    {
      session_id,
      role,
      message,
      timestamp: new Date().toISOString(),
      sentiment,
      escalated,
    },
  ]);

  if (error) {
    throw error;
  }
}

function extractAssistantMessage(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return '';
  }

  const maybeAny = response as any;
  if (maybeAny.choices && Array.isArray(maybeAny.choices) && maybeAny.choices[0]?.message?.content) {
    return String(maybeAny.choices[0].message.content);
  }

  if (maybeAny.choices && Array.isArray(maybeAny.choices) && typeof maybeAny.choices[0]?.text === 'string') {
    return maybeAny.choices[0].text;
  }

  if (typeof maybeAny.message?.content === 'string') {
    return maybeAny.message.content;
  }

  return JSON.stringify(response);
}

function getGroqBaseUrl(): string | undefined {
  if (!GROQ_API_URL) {
    return undefined;
  }

  try {
    return new URL(GROQ_API_URL).origin;
  } catch {
    return GROQ_API_URL;
  }
}

function getGroqPath(): string {
  if (!GROQ_API_URL) {
    return '/openai/v1/chat/completions';
  }

  try {
    const url = new URL(GROQ_API_URL);
    return `${url.pathname}${url.search}`;
  } catch {
    return GROQ_API_URL;
  }
}

function createGroqClient() {
  return new Groq({
    apiKey: GROQ_API_KEY,
    baseURL: getGroqBaseUrl(),
  });
}

async function fetchChatbotResponse(history: Array<{ role: string; content: string }>, message: string): Promise<unknown> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured.');
  }

  const client = createGroqClient();
  const path = getGroqPath();
  const body = buildGroqRequestBody(history, message);

  const response = await client.post(path, { body });
  return response;
}

export async function handleChat(req: Request, res: Response): Promise<void> {
  try {
    const { session_id, message } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "session_id" in request body.' });
      return;
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "message" in request body.' });
      return;
    }

    const sessionMessages = await getLastSessionMessages(session_id);
    const history = sessionMessages.map((row) => ({
      role: row.role,
      content: row.message,
    }));

    await storeConversationMessage(session_id, 'user', message);
    const chatbotData = await fetchChatbotResponse(history, message);
    const assistantMessage = extractAssistantMessage(chatbotData);
    await storeConversationMessage(session_id, 'assistant', assistantMessage);

    res.json({ session_id, history, data: chatbotData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Chatbot request failed.' });
  }
}
