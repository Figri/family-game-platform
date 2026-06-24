"use client";

import { cn } from "@/lib/utils";
import { type Tile, type Suit, getSuitName, WIND_NAMES, DRAGON_NAMES } from "@/lib/games/mahjong";

interface MahjongTileProps {
  tile?: Tile;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SUIT_COLORS: Record<Suit, string> = {
  wan: "text-red-600 dark:text-red-400",
  tiao: "text-emerald-600 dark:text-emerald-400",
  tong: "text-blue-600 dark:text-blue-400",
  wind: "text-teal-700 dark:text-teal-300",
  dragon: "text-amber-700 dark:text-amber-300",
};

const SUIT_BG: Record<Suit, string> = {
  wan: "bg-red-50 dark:bg-red-950/30",
  tiao: "bg-emerald-50 dark:bg-emerald-950/30",
  tong: "bg-blue-50 dark:bg-blue-950/30",
  wind: "bg-teal-50 dark:bg-teal-950/30",
  dragon: "bg-amber-50 dark:bg-amber-950/30",
};

export function MahjongTile({
  tile,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  size = "md",
  className,
}: MahjongTileProps) {
  const sizeClasses = {
    sm: "w-10 h-14 text-base",
    md: "w-14 h-20 text-2xl",
    lg: "w-18 h-24 text-3xl",
  };

  if (faceDown || !tile) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-border bg-muted flex items-center justify-center shadow-sm",
          sizeClasses[size],
          className
        )}
      >
        <div className="w-3/4 h-3/4 rounded bg-muted-foreground/20" />
      </div>
    );
  }

  const colorClass = SUIT_COLORS[tile.suit];
  const bgClass = SUIT_BG[tile.suit];

  const displayText =
    tile.suit === "wind"
      ? WIND_NAMES[tile.value]
      : tile.suit === "dragon"
      ? DRAGON_NAMES[tile.value]
      : `${tile.value}`;

  const suitSymbol =
    tile.suit === "wan"
      ? "万"
      : tile.suit === "tiao"
      ? "条"
      : tile.suit === "tong"
      ? "筒"
      : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-lg border-2 flex flex-col items-center justify-center shadow-sm transition-all select-none",
        sizeClasses[size],
        bgClass,
        colorClass,
        selected
          ? "border-yellow-400 ring-2 ring-yellow-400/50 scale-105 -translate-y-1"
          : "border-border hover:border-primary/60",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={`${displayText}${suitSymbol}`}
    >
      {/* 顶部小字 */}
      <span className="absolute top-0.5 left-1 text-[10px] leading-none opacity-70">
        {displayText}
      </span>

      {/* 中央大字 */}
      <span className="font-bold leading-none mt-1">
        {displayText}
      </span>

      {/* 底部花色 */}
      {suitSymbol && (
        <span className="text-sm font-medium leading-none mt-0.5">
          {suitSymbol}
        </span>
      )}
    </button>
  );
}

/** 横向排列的手牌组 */
export function MahjongHand({
  tiles,
  selectedIds,
  onSelect,
  onClickTile,
  disabled = false,
  size = "lg",
  className,
}: {
  tiles: Tile[];
  selectedIds?: string[];
  onSelect?: (tile: Tile) => void;
  onClickTile?: (tile: Tile) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1 justify-center", className)}>
      {tiles.map((tile) => {
        const isSelected = selectedIds?.includes(tile.id);
        return (
          <MahjongTile
            key={tile.id}
            tile={tile}
            size={size}
            selected={isSelected}
            disabled={disabled}
            onClick={() => {
              onSelect?.(tile);
              onClickTile?.(tile);
            }}
          />
        );
      })}
    </div>
  );
}

/** 碰/杠的牌组显示 */
export function MahjongExposed({
  melds,
  size = "sm",
  className,
}: {
  melds: Tile[][];
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {melds.map((meld, idx) => (
        <div key={idx} className="flex gap-0.5">
          {meld.map((tile, tIdx) => (
            <MahjongTile
              key={`${idx}-${tIdx}`}
              tile={tile}
              size={size}
              className={tIdx === 3 && meld.length === 4 ? "ml-1" : ""}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 弃牌区 */
export function MahjongDiscard({
  discards,
  size = "sm",
  className,
}: {
  discards: { tile: Tile; player: number }[];
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1 justify-center max-w-[280px]", className)}>
      {discards.map((d, idx) => (
        <MahjongTile key={idx} tile={d.tile} size={size} />
      ))}
    </div>
  );
}
