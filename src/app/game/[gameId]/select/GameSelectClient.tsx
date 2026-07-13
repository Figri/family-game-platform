"use client";

import { getGameById } from "@/data/games";

interface GameSelectClientProps {
  gameId: string;
}

export function GameSelectClient({ gameId }: GameSelectClientProps) {
  const game = getGameById(gameId);

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-4" style={{ backgroundColor: "#FFF9F0" }}>
        <span className="text-6xl mb-4">😕</span>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#3D2C1E" }}>
          游戏未找到
        </h1>
        <button
          className="text-white font-bold text-xl px-8 py-3 rounded-2xl"
          style={{ backgroundColor: "#F97316", minHeight: "56px" }}
          onClick={() => { window.location.href = "/family-game-platform/"; }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const isGradient = game.color.startsWith("linear");
  const bgColor = isGradient ? "#F97316" : game.color;

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FFF9F0" }}>
      {/* 顶部 */}
      <header className="flex items-center gap-3 px-4 sm:px-6 py-4">
        <button
          className="text-2xl hover:scale-110 transition-transform"
          style={{ minHeight: "56px", minWidth: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { window.location.href = "/family-game-platform/"; }}
          aria-label="返回首页"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold" style={{ color: "#3D2C1E" }}>
          {game.name}
        </h1>
      </header>

      {/* 中间内容 */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-8">
        {/* 游戏大图标 + 说明 */}
        <div className="text-center">
          <span className="text-8xl block mb-4">{game.emoji}</span>
          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: "#3D2C1E" }}
          >
            {game.name}
          </h2>
          <p className="text-xl" style={{ color: "#8B7355" }}>
            {game.desc}
          </p>
          <span
            className="inline-block mt-3 px-4 py-1 rounded-full text-base font-medium text-white"
            style={{ backgroundColor: bgColor }}
          >
            {game.players}
          </span>
        </div>

        {/* 两个大型按钮 */}
        <div className="w-full max-w-md flex flex-col gap-5">
          {/* 人机对战 */}
          <button
            className="flex flex-col items-center justify-center rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
              minHeight: "120px",
            }}
            onClick={() => { window.location.href = `/family-game-platform/game/${gameId}/play/?mode=pve`; }}
          >
            <span className="text-4xl mb-2">🤖</span>
            <span className="text-2xl font-bold">人机对战</span>
            <span className="text-base opacity-90 mt-1">
              立即和电脑一起玩
            </span>
          </button>

          {/* 好友房 */}
          <button
            className="flex flex-col items-center justify-center rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: "#FFFFFF",
              border: `3px solid ${bgColor}`,
              minHeight: "120px",
            }}
            onClick={() => { window.location.href = `/family-game-platform/game/${gameId}/room/`; }}
          >
            <span className="text-4xl mb-2">👥</span>
            <span className="text-2xl font-bold" style={{ color: bgColor }}>
              好友房
            </span>
            <span
              className="text-base mt-1"
              style={{ color: "#8B7355" }}
            >
              和家人朋友一起玩
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}