"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SichuanMahjongGame } from "@/components/games/sichuan-mahjong-game";
import { type GameRules } from "@/lib/games/sichuan-mahjong";
import { GameWrapper } from "@/components/game-wrapper";

function MahjongGameContent() {
  const searchParams = useSearchParams();
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
    <GameWrapper>
      <SichuanMahjongGame
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
