"use client";

import { Suspense } from "react";
import { DoudizhuGame } from "@/components/games/doudizhu-game";
import { GameWrapper } from "@/components/game-wrapper";

function DoudizhuGameContent() {
  const backUrl = "/family-game-platform/game/doudizhu/select";

  return (
    <GameWrapper landscape>
      <DoudizhuGame onBack={() => { window.location.href = backUrl; }} />
    </GameWrapper>
  );
}

export default function DoudizhuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full bg-background items-center justify-center">
          <div className="text-2xl animate-pulse">加载中...</div>
        </div>
      }
    >
      <DoudizhuGameContent />
    </Suspense>
  );
}