"use client";

import { GAMES } from "@/data/games";

export default function HelpPage() {

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
          游戏帮助
        </h1>
      </header>

      {/* 帮助内容 */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {GAMES.map((game) => {
            const isGradient = game.color.startsWith("linear");
            const bgColor = isGradient ? "#F97316" : game.color;

            return (
              <div
                key={game.id}
                className="rounded-2xl shadow-md overflow-hidden"
                style={{ backgroundColor: "#FFFFFF" }}
              >
                {/* 顶部色条 */}
                <div
                  className="h-2 w-full"
                  style={
                    isGradient
                      ? { background: game.color }
                      : { backgroundColor: game.color }
                  }
                />
                <div className="p-5">
                  {/* 标题行 */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{game.emoji}</span>
                    <h2
                      className="text-xl font-bold"
                      style={{ color: "#3D2C1E" }}
                    >
                      {game.name}
                    </h2>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: bgColor }}
                    >
                      {game.players}
                    </span>
                  </div>

                  {/* 简单玩法 */}
                  <p
                    className="text-base leading-relaxed mb-4"
                    style={{ color: "#5C4A3A" }}
                  >
                    {game.help.play}
                  </p>

                  {/* 重要规则 */}
                  <div>
                    <h3
                      className="text-lg font-bold mb-2"
                      style={{ color: "#3D2C1E" }}
                    >
                      重要规则
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {game.help.rules.map((rule, idx) => (
                        <li
                          key={idx}
                          className="text-base flex items-start gap-2"
                          style={{ color: "#5C4A3A" }}
                        >
                          <span
                            className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: bgColor }}
                          >
                            {idx + 1}
                          </span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}