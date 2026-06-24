"use client";

import { cn } from "@/lib/utils";
import {
  type PokerCard as PokerCardType,
  isRedSuit,
  SUIT_SYMBOLS,
  RANK_DISPLAY,
} from "@/lib/games/poker";

interface PokerCardProps {
  card?: PokerCardType;
  /** 是否显示背面 */
  faceDown?: boolean;
  /** 是否被选中 */
  selected?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 尺寸 */
  size?: "sm" | "md" | "lg";
  /** 是否禁用交互 */
  disabled?: boolean;
}

export function PokerCard({
  card,
  faceDown = false,
  selected = false,
  onClick,
  size = "md",
  disabled = false,
}: PokerCardProps) {
  const sizeClasses = {
    sm: "w-10 h-14 text-sm",
    md: "w-16 h-22 text-xl",
    lg: "w-20 h-28 text-2xl",
  };

  if (faceDown || !card) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-lg border-2 border-border bg-primary/80 flex items-center justify-center select-none",
          "shadow-md"
        )}
      >
        <div className="w-3/4 h-3/4 rounded border border-primary-foreground/20 bg-primary-foreground/10" />
      </div>
    );
  }

  const isRed = isRedSuit(card.suit);
  const isJoker = card.rank === "small-joker" || card.rank === "big-joker";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        sizeClasses[size],
        "rounded-lg border-2 flex flex-col items-center justify-center select-none relative",
        "bg-card shadow-md transition-all duration-150",
        "min-w-[64px] min-h-[88px]",
        "elderly-mode:min-w-[80px] elderly-mode:min-h-[112px]",
        isRed
          ? "text-red-600 border-red-200 dark:border-red-900/50"
          : "text-foreground border-border",
        selected
          ? "ring-4 ring-yellow-400 dark:ring-yellow-600 -translate-y-3 shadow-xl"
          : "hover:-translate-y-1 hover:shadow-lg",
        disabled && "opacity-60 cursor-not-allowed hover:translate-y-0"
      )}
      aria-label={`${RANK_DISPLAY[card.rank]}${isJoker ? "" : SUIT_SYMBOLS[card.suit]}`}
    >
      {/* 左上角点数 */}
      <span
        className={cn(
          "absolute top-1 left-1.5 font-bold leading-none",
          size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-sm"
        )}
      >
        {RANK_DISPLAY[card.rank]}
      </span>

      {/* 中间花色/图案 */}
      <span
        className={cn(
          "font-bold",
          size === "lg"
            ? "text-4xl"
            : size === "md"
              ? "text-3xl"
              : "text-xl"
        )}
      >
        {isJoker ? (card.rank === "big-joker" ? "🃏" : "🃏") : SUIT_SYMBOLS[card.suit]}
      </span>

      {/* 右下角点数（旋转） */}
      <span
        className={cn(
          "absolute bottom-1 right-1.5 font-bold leading-none rotate-180",
          size === "lg" ? "text-xl" : size === "md" ? "text-lg" : "text-sm"
        )}
      >
        {RANK_DISPLAY[card.rank]}
      </span>
    </button>
  );
}

/** 扑克牌背面组件（用于显示其他玩家的牌） */
export function PokerCardBack({
  count,
  size = "md",
}: {
  count?: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-10 h-14",
    md: "w-16 h-22",
    lg: "w-20 h-28",
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-lg border-2 border-border bg-primary/80 flex flex-col items-center justify-center select-none shadow-md",
        "min-w-[64px] min-h-[88px]",
        "elderly-mode:min-w-[80px] elderly-mode:min-h-[112px]"
      )}
    >
      <div className="w-3/4 h-3/4 rounded border border-primary-foreground/20 bg-primary-foreground/10 flex items-center justify-center">
        {count !== undefined && (
          <span className="text-primary-foreground font-bold text-lg elderly-mode:text-2xl">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
