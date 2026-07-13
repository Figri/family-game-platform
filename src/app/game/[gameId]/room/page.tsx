import { GAMES } from "@/data/games";
import { RoomPageClient } from "./RoomPageClient";

export function generateStaticParams() {
  return GAMES.map((game) => ({
    gameId: game.id,
  }));
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return <RoomPageWrapper params={params} />;
}

async function RoomPageWrapper({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <RoomPageClient gameId={gameId} />;
}