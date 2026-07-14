
interface HeaderConfig {
  primary_color?: string;
  avatar_url?: string;
  bot_name?: string;
}

interface HeaderProps {
  config: HeaderConfig;
}

function Header({ config }: HeaderProps) {
  return (
    <div
      style={{
        backgroundColor: config.primary_color,
        color: "white",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {config.avatar_url && (
          <img
            src={config.avatar_url}
            alt=""
            style={{ width: 28, height: 28, borderRadius: "50%" }}
          />
        )}
        <strong>{config.bot_name || "Support"}</strong>
      </div>

      <button
        onClick={() =>
          window.parent.postMessage({ type: "yourbot:close" }, "*")
        }
        style={{
          background: "none",
          border: "none",
          color: "white",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default Header;