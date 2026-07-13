import { GAMES } from "@/data/games";
import { GameSelectClient } from "./GameSelectClient";

export function generateStaticParams() {
  return GAMES.map((game) => ({
    gameId: game.id,
  }));
}

export default function GameSelectPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return <GameSelectClientWrapper params={params} />;
}

async function GameSelectClientWrapper({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameSelectClient gameId={gameId} />;
}