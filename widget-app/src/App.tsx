import { useEffect, useState } from "react";
import Header from "./Header";
import ChatPanel, { TypingDots } from "./ChatPanel";
import { v4 as uuidv4 } from "uuid";


interface WidgetConfig {
  // Replace this with your actual config type
  [key: string]: unknown;
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
    const storageKey = `ybot_session_${key}`;
    let existing = localStorage.getItem(storageKey);
    if (!existing) {
      existing = uuidv4();
      localStorage.setItem(storageKey, existing);
    }
    setSessionId(existing);
  }, []);

  if (!config)
    return (
      <div
        style={{
          boxSizing: "border-box",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TypingDots />
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header config={config} />
      <ChatPanel
        orgKey={orgKey}
        sessionId={sessionId}
        config={config}
      />
    </div>
  );
}

export default App;