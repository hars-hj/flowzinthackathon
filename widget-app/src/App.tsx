import { useEffect, useState } from "react";
import Header from "./Header";
import ChatPanel, { TypingDots } from "./ChatPanel";
import { v4 as uuidv4 } from "uuid";

interface WidgetConfig {
  // Replace this with your actual config type
  [key: string]: unknown;
}

const FONT_STACK =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function getOrCreateSessionId(orgKey: string): string {
  const storageKey = `ybot_session_${orgKey}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = uuidv4();
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    // localStorage unavailable (e.g. blocked third-party storage in iframe) — fall back to an in-memory id
    return uuidv4();
  }
}

function App() {
  const [orgKey, setOrgKey] = useState<string | null>(null);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Read ?org=wk_test_123 from the iframe's own URL
    const params = new URLSearchParams(window.location.search);
    const key = params.get("org");
    setOrgKey(key);

    if (!key) return;

    // 2. Fetch widget config (same endpoint widget.js used)
    fetch(`/api/widget-config?key=${key}`)
      .then((res) => res.json())
      .then((data: WidgetConfig) => setConfig(data));

    // 3. Get or create a session_id, scoped per org
    setSessionId(getOrCreateSessionId(key));
  }, []);

  // Called when the user hits "Reset chat" — mints a fresh session id so a
  // refresh (or reload of the widget) doesn't pull the old conversation back
  // in from the backend, which keys history off session_id.
  function handleResetSession() {
    if (!orgKey) return;
    const storageKey = `ybot_session_${orgKey}`;
    const fresh = uuidv4();
    try {
      localStorage.setItem(storageKey, fresh);
    } catch {
      // storage unavailable — the new id still works for this tab, just won't survive a refresh
    }
    setSessionId(fresh);
  }

  if (!config)
    return (
      <div
        style={{
          boxSizing: "border-box",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0f13",
        }}
      >
        <TypingDots />
      </div>
    );

  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f13",
      }}
    >
      <Header config={config} />
      <ChatPanel orgKey={orgKey} sessionId={sessionId} config={config} onResetSession={handleResetSession} />
    </div>
  );
}

export default App;