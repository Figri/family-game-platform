"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface GameCardData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  href: string;
}

interface GameCardProps {
  game: GameCardData;
}

export function GameCard({ game }: GameCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(game.href)}
      className={cn(
        "group flex flex-col items-center justify-center gap-3 rounded-2xl",
        "bg-card border border-border p-4 text-center",
        "transition-all duration-200",
        "hover:scale-[1.03] hover:shadow-lg hover:border-primary/30",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "elderly-mode:h-[220px] elderly-mode:gap-4 elderly-mode:p-6"
      )}
      style={{ minHeight: "180px" }}
    >
      <span
        className={cn(
          "text-5xl leading-none transition-transform duration-200 group-hover:scale-110",
          "elderly-mode:text-7xl"
        )}
        role="img"
        aria-label={game.name}
      >
        {game.emoji}
      </span>
      <h3
        className={cn(
          "text-lg font-semibold text-foreground",
          "elderly-mode:text-2xl"
        )}
      >
        {game.name}
      </h3>
      <p
        className={cn(
          "text-sm text-muted-foreground line-clamp-2",
          "elderly-mode:text-lg"
        )}
      >
        {game.description}
      </p>
    </button>
  );
}
