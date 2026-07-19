interface HeaderConfig {
  primary_color?: string;
  avatar_url?: string;
  bot_name?: string;
}

interface HeaderProps {
  config: HeaderConfig;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Header({ config }: HeaderProps) {
  const botName = config.bot_name || "Support";

  return (
    <div
      style={{
        backgroundColor: "#17171c",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        color: "white",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {config.avatar_url ? (
          <img
            src={config.avatar_url}
            alt=""
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: config.primary_color || "#5B4FE9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(botName)}
          </div>
        )}

        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.2 }}>{botName}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#3ECF8E",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>Online</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.parent.postMessage({ type: "yourbot:close" }, "*")}
        aria-label="Close chat"
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          fontSize: "18px",
          cursor: "pointer",
          padding: "4px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default Header;