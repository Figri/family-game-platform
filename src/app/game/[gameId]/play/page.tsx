import { Suspense } from "react";
import { GAMES } from "@/data/games";
import { PlayPageClient } from "./PlayPageClient";

export function generateStaticParams() {
  return GAMES.map((game) => ({
    gameId: game.id,
  }));
}

export default function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return <PlayPageWrapper params={params} />;
}

async function PlayPageWrapper({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return (
    <Suspense
      fallback={
        <div
          className="flex flex-col items-center justify-center min-h-full"
          style={{ backgroundColor: "#FFF9F0" }}
        >
          <div className="text-2xl animate-pulse" style={{ color: "#8B7355" }}>
            加载中...
          </div>
        </div>
      }
    >
      <PlayPageClient gameId={gameId} />
    </Suspense>
  );
}