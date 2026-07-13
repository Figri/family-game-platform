"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SichuanMahjongGame } from "@/components/games/sichuan-mahjong-game";
import { type GameRules, DEFAULT_RULES } from "@/lib/games/sichuan-mahjong";

function MahjongGameContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "pve";
  const backUrl = "/family-game-platform/game/mahjong/select";

  // 从URL参数解析规则
  const rules: GameRules = {
    enablePong: searchParams.get("enablePong") !== "false",
    enableMingKong: searchParams.get("enableMingKong") !== "false",
    enableAnKong: searchParams.get("enableAnKong") !== "false",
    enableBuKong: searchParams.get("enableBuKong") !== "false",
    enableQiangGangHu: searchParams.get("enableQiangGangHu") !== "false",
    enableDianPao: searchParams.get("enableDianPao") !== "false",
    enableZiMoFan: searchParams.get("enableZiMoFan") !== "false",
    enableGangShangKaiHua: searchParams.get("enableGangShangKaiHua") !== "false",
    enableHaiDiLaoYue: searchParams.get("enableHaiDiLaoYue") !== "false",
    enableSwapThree: searchParams.get("enableSwapThree") !== "false",
    enableLack: searchParams.get("enableLack") !== "false",
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { window.location.href = backUrl; }}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label="返回菜单"
          >
            ←
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight elderly-mode:text-2xl">
              四川麻将
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              {mode === "room" ? "👥 好友房" : "🤖 人机对战"}
            </span>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className="flex-1 flex items-start justify-center overflow-auto">
        <SichuanMahjongGame
          rules={rules}
          onBack={() => { window.location.href = backUrl; }}
        />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 四川麻将
      </footer>
    </div>
  );
}

export default function MahjongPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <MahjongGameContent />
    </Suspense>
  );
}
