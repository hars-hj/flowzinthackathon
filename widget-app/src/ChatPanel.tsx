import { useEffect, useRef, useState } from "react";
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
    <div className="typing-dots" aria-label="Loading" style={{ display: "flex", gap: "4px" }}>
      <span style={dotStyle} />
      <span style={{ ...dotStyle, animationDelay: "0.2s" }} />
      <span style={{ ...dotStyle, animationDelay: "0.4s" }} />
      <style>{`
        @keyframes ybot-bounce { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
      `}</style>
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#9a9aa5",
  display: "inline-block",
  animation: "ybot-bounce 1.2s infinite",
};

interface ChatConfig {
  primary_color?: string;
  welcome_message?: string;
  quick_questions?: string[];
  bot_name?: string;
  avatar_url?: string;
}

interface ChatPanelProps {
  orgKey: string | null;
  sessionId: string | null;
  config: ChatConfig;
  onResetSession: () => void;
}

type TicketStatus = "none" | "waiting" | "in_progress" | "resolved";

function getStoredEmail(orgKey: string): string | null {
  try {
    return localStorage.getItem(`ybot_email_${orgKey}`);
  } catch {
    return null;
  }
}
function storeEmail(orgKey: string, email: string) {
  try {
    localStorage.setItem(`ybot_email_${orgKey}`, email);
  } catch {
    // storage unavailable — email just won't be remembered next session
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Small avatar shown next to bot / agent messages
function BotAvatar({ config }: { config: ChatConfig }) {
  const name = config.bot_name || "Support";
  if (config.avatar_url) {
    return (
      <img
        src={config.avatar_url}
        alt=""
        style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: config.primary_color || "#5B4FE9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        fontWeight: 600,
        color: "white",
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function HumanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function ChatPanel({ orgKey, sessionId, config, onResetSession }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>("none");
  const [isEscalating, setIsEscalating] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = config.primary_color || "#5B4FE9";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleEscalateClick() {
    if (ticketId && ticketStatus !== "resolved") return; // block only while a ticket is actively open
    const storedEmail = orgKey ? getStoredEmail(orgKey) : null;
    if (!storedEmail) {
      setShowEmailPrompt(true);
      return;
    }
    await createTicket(storedEmail);
  }

  function handleStartNewChat() {
    setMessages([]);
    setTicketId(null);
    setTicketStatus("none");
    setInput("");
    setSendError(null);
    onResetSession(); // new session id — stops the old conversation reappearing on refresh
  }

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
    setSendError(null);

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
        setSendError("That message didn't send. Check your connection and try again.");
      }
      return;
    }

    setLoading(true);
    try {
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
    } catch (err) {
      console.error("Failed to get a reply:", err);
      setSendError("Couldn't reach support right now. Try again, or talk to a human.");
    } finally {
      setLoading(false);
    }
  }

  // --- Escalation: prompts for email first, then creates the ticket ---
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
      setSendError("Couldn't reach an agent right now. You can try again in a moment.");
    } finally {
      setIsEscalating(false);
    }
  }

  const showActionRow = (ticketStatus === "none" || ticketStatus === "resolved") && messages.length > 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#0f0f13" }}>
      {/* Message list */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.length === 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: "#e4e4e7", fontSize: "14px", margin: "0 0 12px" }}>{config.welcome_message}</p>
            {(config.quick_questions || []).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                style={quickQuestionStyle}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              justifyContent: m.sender === "user" ? "flex-end" : "flex-start",
              margin: "8px 0",
            }}
          >
            {m.sender === "bot" && <BotAvatar config={config} />}
            <span
              style={{
                display: "inline-block",
                padding: "9px 13px",
                borderRadius: m.sender === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: m.sender === "user" ? accent : "#1c1c22",
                border: m.sender === "user" ? "none" : "1px solid #2a2a32",
                color: m.sender === "user" ? "white" : "#e4e4e7",
                fontSize: "14px",
                textAlign: "left",
                maxWidth: "75%",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {m.content}
            </span>
          </div>
        ))}

        {/* Ticket status banner — replaces the old one-off static message */}
        {ticketStatus === "waiting" && (
          <div style={bannerStyle("#3a2f10", "#e8b84b")}>
            <span>Waiting for an agent — they'll join this chat as soon as one is free.</span>
          </div>
        )}
        {ticketStatus === "in_progress" && (
          <div style={bannerStyle("#0f2e22", "#3ECF8E")}>
            <span>You're chatting with a human agent.</span>
          </div>
        )}

        {sendError && (
          <div style={bannerStyle("#331a1a", "#e8746b")}>
            <span>{sendError}</span>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", margin: "8px 0" }}>
            <BotAvatar config={config} />
            <span style={{ display: "inline-block", padding: "10px 14px", borderRadius: "4px 14px 14px 14px", background: "#1c1c22", border: "1px solid #2a2a32" }}>
              <TypingDots />
            </span>
          </div>
        )}
      </div>

      {/* Action row — always available: manual reset + human handoff */}
      {showActionRow && (
        <div style={{ display: "flex", gap: "8px", padding: "0 16px 8px" }}>
          <button onClick={handleEscalateClick} disabled={isEscalating} style={actionButtonStyle}>
            <HumanIcon /> {isEscalating ? "Connecting..." : "Talk to a human"}
          </button>

          <button onClick={handleStartNewChat} style={actionButtonStyle}>
            <RefreshIcon /> Reset chat
          </button>
        </div>
      )}

      {/* Email prompt, shown before first-ever escalation */}
      {showEmailPrompt && (
        <div style={{ margin: "0 16px 12px", padding: "12px", borderRadius: "10px", border: "1px solid #2a2a32", background: "#1c1c22" }}>
          <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#e4e4e7" }}>
            What's your email? So you don't lose this chat and our agent can follow up.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
            <button onClick={() => createTicket(emailInput || undefined)} style={{ padding: "0 16px", borderRadius: "8px", background: accent, color: "white", border: "none", fontSize: "13px", fontWeight: 600 }}>
              Continue
            </button>
          </div>
          <button
            onClick={() => createTicket(undefined)}
            style={{ marginTop: "6px", background: "none", border: "none", color: "#8a8a94", fontSize: "12px", cursor: "pointer" }}
          >
            Skip
          </button>
        </div>
      )}

      {/* Input box */}
      <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid #1f1f26", background: "#17171c" }}>
        <input
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && sendMessage(input)}
          placeholder="Type a message..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => sendMessage(input)}
          aria-label="Send message"
          style={{
            width: 38,
            height: 38,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: accent,
            border: "none",
            cursor: "pointer",
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

const quickQuestionStyle: React.CSSProperties = {
  display: "block",
  margin: "6px 0",
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #2a2a32",
  background: "#1c1c22",
  color: "#e4e4e7",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  fontSize: "13px",
};

const actionButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #2a2a32",
  background: "#1c1c22",
  cursor: "pointer",
  fontSize: "12px",
  color: "#c4c4cc",
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: "10px",
  border: "1px solid #2a2a32",
  background: "#1c1c22",
  color: "#e4e4e7",
  fontSize: "14px",
  outline: "none",
};

function bannerStyle(bg: string, fg: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: bg,
    color: fg,
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "12px",
    margin: "8px 0",
  };
}

export default ChatPanel;