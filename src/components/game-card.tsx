"use client";

import { cn } from "@/lib/utils";

interface GameCardProps {
  name: string;
  emoji: string;
  desc: string;
  players: string;
  color: string;
  onClick: () => void;
}

export function GameCard({
  name,
  emoji,
  desc,
  players,
  color,
  onClick,
}: GameCardProps) {
  const isGradient = color.startsWith("linear");

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group flex flex-col items-stretch rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 cursor-pointer select-none"
    >
      {/* 主题色顶部 */}
      <div
        className="h-3 w-full"
        style={isGradient ? { background: color } : { backgroundColor: color }}
      />
      <div className="p-4 flex flex-col items-center gap-2">
        {/* emoji 图标 */}
        <span
          className="text-5xl leading-none transition-transform duration-200 group-hover:scale-110"
          role="img"
          aria-label={name}
        >
          {emoji}
        </span>
        {/* 游戏名 */}
        <span className="text-xl font-bold text-[#3D2C1E] whitespace-nowrap">{name}</span>
        {/* 说明 */}
        <span className="text-base text-[#8B7355] text-center leading-snug whitespace-nowrap">
          {desc}
        </span>
        {/* 人数标签 */}
        <span
          className={cn(
            "inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
          )}
          style={
            isGradient
              ? { backgroundColor: "#F97316" }
              : { backgroundColor: color }
          }
        >
          {players}
        </span>
        {/* 去玩按钮 */}
        <span
          className="mt-1 w-full text-center py-3 rounded-xl font-semibold text-white text-lg transition-opacity group-hover:opacity-90"
          style={
            isGradient
              ? { backgroundColor: "#F97316" }
              : { backgroundColor: color }
          }
        >
          去玩
        </span>
      </div>
    </div>
  );
}