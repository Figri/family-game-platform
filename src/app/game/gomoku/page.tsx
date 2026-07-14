"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GomokuBoard } from "@/components/games/gomoku-board";
import { type GameMode } from "@/lib/games/gomoku";
import { GameWrapper } from "@/components/game-wrapper";

function GomokuGameContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "pve" || modeParam === "room" ? "pve" : "pvp";

  return (
    <GameWrapper>
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
        {/* Header - compact */}
        <header
          className="shrink-0 flex items-center justify-between px-3 bg-background"
          style={{ height: "44px" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => { window.location.href = "/family-game-platform/game/gomoku/select"; }}
              className="text-lg font-semibold text-muted-foreground hover:text-foreground transition-colors"
              style={{ touchAction: "manipulation" }}
              aria-label="返回菜单"
            >
              &larr;
            </button>
            <span className="text-base font-bold">五子棋</span>
            <span className="text-xs text-muted-foreground">
              {modeParam === "room" ? "好友房" : mode === "pve" ? "人机" : "双人"}
            </span>
          </div>
        </header>

        {/* Game Board - fills remaining space */}
        <main className="flex-1 min-h-0 flex items-center justify-center px-2 overflow-hidden">
          <GomokuBoard mode={mode} />
        </main>
      </div>
    </GameWrapper>
  );
}

export default function GomokuPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col bg-background items-center justify-center"
          style={{ width: "100vw", height: "100dvh" }}
        >
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <GomokuGameContent />
    </Suspense>
  );
}
