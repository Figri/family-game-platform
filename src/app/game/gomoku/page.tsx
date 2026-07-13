"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GomokuBoard } from "@/components/games/gomoku-board";
import { type GameMode } from "@/lib/games/gomoku";
import { cn } from "@/lib/utils";

function GomokuGameContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "pve" || modeParam === "room" ? "pve" : "pvp";
  const backUrl = "/family-game-platform/game/gomoku/select";

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
              五子棋
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              {modeParam === "room" ? "👥 好友房" : mode === "pve" ? "🤖 人机对战" : "👥 双人对战"}
            </span>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className={cn("flex-1 flex items-start justify-center py-4")}>
        <GomokuBoard mode={mode} />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 五子棋
      </footer>
    </div>
  );
}

export default function GomokuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <GomokuGameContent />
    </Suspense>
  );
}
