import { useEffect, useState } from "react";

interface Message {
  sender: "user" | "bot";
  content: string;
  sources?: unknown;
}

// Raw shape as it may come back from the history endpoint — DB rows use
// `role` ("user" | "assistant" / "bot") and sometimes `text` instead of
// `content`. Normalize everything to the `Message` shape the UI expects.
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

// Three-dot "typing" indicator — dots rise and fall one after another.
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

function ChatPanel({ orgKey, sessionId, config }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Load existing history on mount
  useEffect(() => {
    if (!sessionId || !orgKey) return;

    fetch(`/api/conversations?org=${orgKey}&session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data: { messages?: RawMessage[] }) =>
        setMessages((data.messages || []).map(normalizeMessage))
      );
  }, [sessionId, orgKey]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = {
      sender: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widget_key: orgKey,
        session_id: sessionId,
        message: text,
      }),
    });

    const data: {
      reply: string;
      sources?: unknown;
    } = await res.json();

    setMessages((prev) => [
      ...prev,
      normalizeMessage({
        sender: "bot",
        content: data.reply,
        sources: data.sources,
      }),
    ]);

    setLoading(false);
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflow: "hidden",
      }}
    >
      {/* Quick questions shown only if no messages yet */}
      {messages.length === 0 && (
        <div style={{ marginBottom: "12px" }}>
          <p>{config.welcome_message}</p>

          {(config.quick_questions || []).map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              style={{
                display: "block",
                margin: "6px 0",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.sender === "user" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: "12px",
                background:
                  m.sender === "user"
                    ? config.primary_color
                    : "#f1f1f1",
                color: m.sender === "user" ? "white" : "black",
                maxWidth: "80%",
              }}
            >
              {m.content}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "#f1f1f1",
              }}
            >
              <TypingDots />
            </span>
          </div>
        )}
      </div>

      {/* Input box */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && sendMessage(input)
          }
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />

        <button
          onClick={() => sendMessage(input)}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            background: config.primary_color,
            color: "white",
            border: "none",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;