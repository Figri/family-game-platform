"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MahjongGame } from "@/components/games/mahjong-game";
import { type GameRules } from "@/lib/games/sichuan-mahjong";
import { GameWrapper } from "@/components/game-wrapper";

function MahjongGameContent() {
  const searchParams = useSearchParams();
  const backUrl = "/family-game-platform/game/mahjong/menu";

  const rules: GameRules = {
    enablePong: searchParams.get("enablePong") !== "false",
    enableMingKong: searchParams.get("enableMingKong") !== "false",
    enableAnKong: searchParams.get("enableAnKong") !== "false",
    enableBuKong: searchParams.get("enableBuKong") !== "false",
    enableDianPao: searchParams.get("enableDianPao") !== "false",
    enableZiMo: searchParams.get("enableZiMo") !== "false",
  };

  return (
    <GameWrapper landscape>
      <MahjongGame
        rules={rules}
        onBack={() => { window.location.href = backUrl; }}
      />
    </GameWrapper>
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
