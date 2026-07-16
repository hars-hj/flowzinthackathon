import { useEffect, useState } from "react";
import { getSocket } from "./lib/socket";

interface Message {
  sender: "user" | "bot";
  content: string;
  sources?: unknown;
}

interface RawMessage {
  sender?: string;
  role?: string;
  content?: string;
  text?: string;
  sources?: unknown;
}

function normalizeMessage(raw: RawMessage): Message {
  const senderSource = raw.sender ?? raw.role ?? "bot";
  const sender: Message["sender"] = senderSource === "user" ? "user" : "bot";
  return {
    sender,
    content: raw.content ?? raw.text ?? "",
    sources: raw.sources,
  };
}

export function TypingDots() {
  return (
    <div className="typing-dots" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}

interface ChatConfig {
  primary_color?: string;
  welcome_message?: string;
  quick_questions?: string[];
}

interface ChatPanelProps {
  orgKey: string | null;
  sessionId: string | null;
  config: ChatConfig;
}

type TicketStatus = "none" | "waiting" | "in_progress" | "resolved";

function getStoredEmail(orgKey: string): string | null {
  return localStorage.getItem(`ybot_email_${orgKey}`);
}
function storeEmail(orgKey: string, email: string) {
  localStorage.setItem(`ybot_email_${orgKey}`, email);
}

function ChatPanel({ orgKey, sessionId, config }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>("none");
  const [isEscalating, setIsEscalating] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (!sessionId || !orgKey) return;

    async function loadHistory() {
      // 1. Load bot conversation history
      const convRes = await fetch(`/api/conversations?org=${orgKey}&session_id=${sessionId}`);
      const convData: { messages?: RawMessage[] } = await convRes.json();
      let allMessages: Message[] = (convData.messages || []).map(normalizeMessage);

      // 2. Check for a ticket, and if one exists, load and merge its messages too
      const ticketRes = await fetch(`/api/tickets/status?widgetKey=${orgKey}&sessionId=${sessionId}`);
      const ticketData: { ticket: { id: string; status: TicketStatus } | null } = await ticketRes.json();

      if (ticketData.ticket) {
        setTicketId(ticketData.ticket.id);
        setTicketStatus(ticketData.ticket.status);

        const msgRes = await fetch(`/api/tickets/${ticketData.ticket.id}/public-messages?widgetKey=${orgKey}`);
        const msgData: { messages: { sender_role: string; content: string; created_at: string }[] } = await msgRes.json();

        const ticketMessages: Message[] = (msgData.messages || []).map((m) => ({
          sender: m.sender_role === "user" ? "user" : "bot",
          content: m.content,
        }));

        allMessages = [...allMessages, ...ticketMessages];
      }

      setMessages(allMessages);
    }

    loadHistory();
  }, [sessionId, orgKey]);

  // --- Socket wiring, active only once a ticket exists ---
  useEffect(() => {
    if (!ticketId) return;
    const socket = getSocket();

    const joinRoom = () => socket.emit("join_ticket", ticketId);
    joinRoom();
    socket.on("connect", joinRoom);

    const onClaimed = (ticket: { id: string }) => {
      if (ticket.id !== ticketId) return;
      setTicketStatus("in_progress");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", content: "An agent has joined. You can now chat directly." },
      ]);
    };

     const onMessage = (message: { sender_role: string; content: string }) => {
      if (message.sender_role === "user") return; // skip echo of our own message
      setMessages((prev) => [...prev, { sender: "bot", content: message.content }]);
    };

    const onResolved = (ticket: { id: string }) => {
      if (ticket.id !== ticketId) return;
      setTicketStatus("resolved");
      setMessages((prev) => [
        ...prev,
        { sender: "bot", content: "This conversation has been resolved. Thank you for contacting support." },
      ]);
    };

    socket.on("ticket:claimed", onClaimed);
    socket.on("message:new", onMessage);
    socket.on("ticket:resolved", onResolved);

    return () => {
      socket.off("connect", joinRoom);
      socket.off("ticket:claimed", onClaimed);
      socket.off("message:new", onMessage);
      socket.off("ticket:resolved", onResolved);
    };
  }, [ticketId]);

  // --- Send message: routes to ticket or RAG depending on state ---
  async function sendMessage(text: string) {
  if (!text.trim()) return;

  const userMsg: Message = { sender: "user", content: text };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  // In-ticket mode (waiting OR in_progress): goes to the ticket, never RAG
  if (ticketId && (ticketStatus === "waiting" || ticketStatus === "in_progress")) {
    try {
      await fetch(`/api/tickets/${ticketId}/user-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey: orgKey, content: text }),
      });
    } catch (err) {
      console.error("Failed to send to agent:", err);
    }
    return; 
  }

  setLoading(true);
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widget_key: orgKey, session_id: sessionId, message: text }),
  });
  const data: { reply: string; sources?: unknown } = await res.json();

  setMessages((prev) => [
    ...prev,
    normalizeMessage({ sender: "bot", content: data.reply, sources: data.sources }),
  ]);
  setLoading(false);
}

  // --- Escalation: prompts for email first, then creates the ticket ---
  async function handleEscalateClick() {
    if (ticketId) return;
    const storedEmail = orgKey ? getStoredEmail(orgKey) : null;
    if (!storedEmail) {
      setShowEmailPrompt(true);
      return;
    }
    await createTicket(storedEmail);
  }

  async function createTicket(email?: string) {
    if (!orgKey || !sessionId) return;
    setIsEscalating(true);
    try {
      if (email) storeEmail(orgKey, email);
      const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user")?.content ?? "";

      const res = await fetch("/api/tickets/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey: orgKey, sessionId, question: lastUserMessage, email }),
      });
      const data: { ticket: { id: string } } = await res.json();

      setTicketId(data.ticket.id);
      setTicketStatus("waiting");
      setShowEmailPrompt(false);
      setMessages((prev) => [...prev, { sender: "bot", content: "I'm connecting you to a human agent. Please wait..." }]);
    } catch (err) {
      console.error("Escalation failed:", err);
    } finally {
      setIsEscalating(false);
    }
  }
      

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px", overflow: "hidden" }}>
      {/* Quick questions shown only if no messages yet */}
      {messages.length === 0 && (
        <div style={{ marginBottom: "12px" }}>
          <p>{config.welcome_message}</p>
          {(config.quick_questions || []).map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              style={{ display: "block", margin: "6px 0", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", width: "100%", textAlign: "left" }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === "user" ? "right" : "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "12px",
                background: m.sender === "user" ? config.primary_color : "#f1f1f1",
                color: m.sender === "user" ? "white" : "black",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",   // preserves line breaks, allows wrapping
                wordBreak: "break-word",  // breaks long unbroken strings (URLs, etc.)
                overflowWrap: "break-word",
              }}
            >
              {m.content}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: "left", margin: "8px 0" }}>
            <span style={{ display: "inline-block", padding: "10px 14px", borderRadius: "12px", background: "#f1f1f1" }}>
              <TypingDots />
            </span>
          </div>
        )}
      </div>

      {/* Talk to a human — hidden once a ticket exists */}
      {ticketStatus === "none" && messages.length > 0 && (
        <button
          onClick={handleEscalateClick}
          disabled={isEscalating}
          style={{
            margin: "8px 0",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
            fontSize: "13px",
            color: "#555",
          }}
        >
          {isEscalating ? "Connecting..." : "Talk to a human"}
        </button>
      )}

      {/* Email prompt, shown before first-ever escalation */}
      {showEmailPrompt && (
        <div style={{ margin: "8px 0", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "#fafafa" }}>
          <p style={{ margin: "0 0 8px", fontSize: "13px" }}>
            What's your email? So you don't lose this chat and our agent can follow up.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              style={{ flex: 1, padding: "6px 8px", borderRadius: "6px", border: "1px solid #ddd" }}
            />
            <button
              onClick={() => createTicket(emailInput || undefined)}
              style={{ padding: "6px 12px", borderRadius: "6px", background: config.primary_color, color: "white", border: "none" }}
            >
              Continue
            </button>
          </div>
          <button
            onClick={() => createTicket(undefined)}
            style={{ marginTop: "6px", background: "none", border: "none", color: "#888", fontSize: "12px", cursor: "pointer" }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Input box — disabled once resolved */}
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && sendMessage(input)}
          placeholder={ticketStatus === "resolved" ? "This chat has ended" : "Type a message..."}
          disabled={ticketStatus === "resolved"}
          style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={ticketStatus === "resolved"}
          style={{ padding: "8px 14px", borderRadius: "8px", background: config.primary_color, color: "white", border: "none" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;