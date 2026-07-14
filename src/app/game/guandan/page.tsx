"use client";

import { Suspense } from "react";
import { GuandanGame } from "@/components/games/guandan-game";
import { GameWrapper } from "@/components/game-wrapper";

function GuandanGameContent() {
  const backUrl = "/family-game-platform/game/guandan/select";

  return (
    <GameWrapper landscape>
      <GuandanGame onBack={() => { window.location.href = backUrl; }} />
    </GameWrapper>
  );
}

export default function GuandanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <GuandanGameContent />
    </Suspense>
  );
}
