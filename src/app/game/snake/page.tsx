"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SnakeGame } from "@/components/games/snake-game";
import { type GameMode } from "@/lib/games/snake";
import { GameWrapper } from "@/components/game-wrapper";

function SnakeGameContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "duo" ? "duo" : "single";

  return (
    <GameWrapper>
      <SnakeGame mode={mode} />
    </GameWrapper>
  );
}

export default function SnakePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col bg-[#FFF9F0] items-center justify-center"
          style={{ width: "100vw", height: "100dvh" }}
        >
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <SnakeGameContent />
    </Suspense>
  );
}
