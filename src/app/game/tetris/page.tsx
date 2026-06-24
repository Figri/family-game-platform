"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { TetrisGame } from "@/components/games/tetris-game";
import { type GameMode } from "@/lib/games/tetris";
import { cn } from "@/lib/utils";

function TetrisGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "duo" ? "duo" : "single";

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/game/tetris/menu")}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label="返回菜单"
          >
            ←
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight elderly-mode:text-2xl">
              俄罗斯方块
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              {mode === "single" ? "🟥 单机模式" : "👥 双人对战"}
            </span>
          </div>
        </div>
      </header>

      {/* Game Board */}
      <main className={cn("flex-1 flex items-start justify-center py-4 px-4")}>
        <TetrisGame mode={mode} />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 俄罗斯方块
      </footer>
    </div>
  );
}

export default function TetrisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <TetrisGameContent />
    </Suspense>
  );
}
