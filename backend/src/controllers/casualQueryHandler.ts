type CasualResponse = {
  ok: boolean;
  message: string;
};

export function handleCasualQuery(query: string): CasualResponse {
  const text = query.trim().toLowerCase();

  const responses: Record<string, string> = {
    // Greetings
    "hi": "Hi! How can I help you today?",
    "hii": "Hi! How can I help you today?",
    "hiee": "Hi! How can I help you today?",
    "hello": "Hello! How can I assist you today?",
    "hey": "Hey! What can I help you with?",
    "good morning": "Good morning! How can I help you?",
    "good afternoon": "Good afternoon! How can I help you?",
    "good evening": "Good evening! How can I assist you?",

    // Thanks
    "thanks": "You're welcome! Let me know if you need anything else.",
    "thank you": "You're welcome! Happy to help.",
    "thx": "You're welcome!",
    "ty": "You're welcome!",

    // Farewell
    "bye": "Goodbye! Have a great day!",
    "goodbye": "Goodbye! Feel free to reach out anytime.",
    "see you": "See you! Have a wonderful day.",

    // Identity
    "who are you": "I'm your AI support assistant. How can I help you today?",
    "what are you": "I'm an AI assistant here to answer your questions.",

    // Simple responses
    "how are you": "I'm doing well, thanks for asking! How can I help you today?",
    "good job": "Thank you! I'm glad I could help.",
    "nice": "Thank you!"
  };

  if (responses[text]) {
    return {
      ok: true,
      message: responses[text],
    };
  }

  return {
    ok: false,
    message: "",
  };
}