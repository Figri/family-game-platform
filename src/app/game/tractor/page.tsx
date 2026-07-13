"use client";

import { Suspense } from "react";
import { TractorGame } from "@/components/games/tractor-game";
import { GameWrapper } from "@/components/game-wrapper";

function TractorGameContent() {
  const backUrl = "/family-game-platform/game/tractor/select";

  return (
    <GameWrapper>
      <TractorGame onBack={() => { window.location.href = backUrl; }} />
    </GameWrapper>
  );
}

export default function TractorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <TractorGameContent />
    </Suspense>
  );
}
