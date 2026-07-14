"use client";

interface GameResultModalProps {
  result: "win" | "lose" | "draw" | null;
  message?: string;
  onRestart: () => void;
  onBack: () => void;
}

export function GameResultModal({
  result,
  message,
  onRestart,
  onBack,
}: GameResultModalProps) {
  if (!result) return null;

  const config = {
    win: {
      icon: "🎉",
      title: "你赢了！",
      subtitle: message || "太棒了，继续加油！",
      bg: "#FEF3C7",
      border: "#F59E0B",
      titleColor: "#D97706",
    },
    lose: {
      icon: "😅",
      title: "这局输了",
      subtitle: message || "再来一次吧",
      bg: "#F3F4F6",
      border: "#9CA3AF",
      titleColor: "#4B5563",
    },
    draw: {
      icon: "🤝",
      title: "本局平局",
      subtitle: message || "势均力敌",
      bg: "#E0F2FE",
      border: "#38BDF8",
      titleColor: "#0369A1",
    },
  }[result];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // 点击背景不关闭，只做轻微反馈
        }
      }}
    >
      <div
        style={{
          background: config.bg,
          border: `3px solid ${config.border}`,
          borderRadius: "24px",
          padding: "32px 40px",
          textAlign: "center",
          minWidth: "280px",
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "56px", marginBottom: "8px" }}>{config.icon}</div>
        <h2
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            color: config.titleColor,
            marginBottom: "8px",
          }}
        >
          {config.title}
        </h2>
        <p
          style={{
            fontSize: "18px",
            color: "#6B7280",
            marginBottom: "28px",
          }}
        >
          {config.subtitle}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={onRestart}
            style={{
              width: "100%",
              height: "54px",
              borderRadius: "14px",
              fontSize: "20px",
              fontWeight: "bold",
              color: "#fff",
              background: "#F97316",
              border: "none",
              cursor: "pointer",
            }}
          >
            再来一局
          </button>
          <button
            onClick={onBack}
            style={{
              width: "100%",
              height: "54px",
              borderRadius: "14px",
              fontSize: "20px",
              fontWeight: "bold",
              color: "#374151",
              background: "#E5E7EB",
              border: "none",
              cursor: "pointer",
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
