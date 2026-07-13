"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TetrisGame } from "@/components/games/tetris-game";
import { type GameMode } from "@/lib/games/tetris";
import { GameWrapper } from "@/components/game-wrapper";

function TetrisGameContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "duo" ? "duo" : "single";

  return (
    <GameWrapper>
      <TetrisGame mode={mode} />
    </GameWrapper>
  );
}

export default function TetrisPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col bg-[#FFF9F0] items-center justify-center"
          style={{
            width: "100vw",
            height: "100dvh",
          }}
        >
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <TetrisGameContent />
    </Suspense>
  );
}
