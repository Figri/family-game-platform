import { GAMES } from "@/data/games";
import { WaitPageClient } from "./WaitPageClient";

export function generateStaticParams() {
  return GAMES.map((game) => ({
    gameId: game.id,
  }));
}

export default function WaitPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  return <WaitPageWrapper params={params} />;
}

async function WaitPageWrapper({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <WaitPageClient gameId={gameId} />;
}