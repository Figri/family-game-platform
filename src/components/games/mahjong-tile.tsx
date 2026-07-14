"use client";

import { cn } from "@/lib/utils";
import { type Tile, type Suit, WIND_NAMES, DRAGON_NAMES } from "@/lib/games/mahjong";

interface MahjongTileProps {
  tile?: Tile;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "xs" | "sm" | "md" | "lg" | "hand";
  className?: string;
  orientation?: "portrait" | "landscape";
  style?: React.CSSProperties;
}

const WAN_NUMBERS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 牌背 */
function TileBack({
  className,
  orientation = "portrait",
}: {
  className?: string;
  orientation?: "portrait";
}) {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{
        aspectRatio: "0.7",
        borderRadius: 4,
        background: "linear-gradient(160deg, #2563EB 0%, #1E40AF 50%, #1E3A8A 100%)",
        boxShadow:
          "inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 2px 3px 6px rgba(0,0,0,0.4)",
      }}
    >
      {/* 内框装饰 */}
      <div
        className="absolute rounded-sm"
        style={{
          top: "12%",
          left: "12%",
          right: "12%",
          bottom: "12%",
          border: "2px solid rgba(255,255,255,0.25)",
        }}
      />
      {/* 中心菱形 */}
      <div
        className="absolute"
        style={{
          width: "38%",
          height: "38%",
          border: "1.5px solid rgba(255,255,255,0.3)",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

/** 筒子图案 */
function TongPattern({ count }: { count: number }) {
  const configs: Record<number, { cx: number; cy: number; r: number; color: string }[]> = {
    1: [{ cx: 50, cy: 50, r: 22, color: "#DC2626" }],
    2: [
      { cx: 50, cy: 25, r: 12, color: "#1F2937" },
      { cx: 50, cy: 75, r: 12, color: "#DC2626" },
    ],
    3: [
      { cx: 50, cy: 22, r: 11, color: "#DC2626" },
      { cx: 28, cy: 62, r: 11, color: "#1F2937" },
      { cx: 72, cy: 62, r: 11, color: "#16A34A" },
    ],
    4: [
      { cx: 28, cy: 25, r: 11, color: "#1F2937" },
      { cx: 72, cy: 25, r: 11, color: "#DC2626" },
      { cx: 28, cy: 75, r: 11, color: "#DC2626" },
      { cx: 72, cy: 75, r: 11, color: "#1F2937" },
    ],
    5: [
      { cx: 28, cy: 25, r: 10, color: "#DC2626" },
      { cx: 72, cy: 25, r: 10, color: "#1F2937" },
      { cx: 50, cy: 50, r: 10, color: "#DC2626" },
      { cx: 28, cy: 75, r: 10, color: "#1F2937" },
      { cx: 72, cy: 75, r: 10, color: "#DC2626" },
    ],
    6: [
      { cx: 28, cy: 22, r: 9, color: "#16A34A" },
      { cx: 50, cy: 22, r: 9, color: "#DC2626" },
      { cx: 72, cy: 22, r: 9, color: "#1F2937" },
      { cx: 28, cy: 72, r: 9, color: "#DC2626" },
      { cx: 50, cy: 72, r: 9, color: "#1F2937" },
      { cx: 72, cy: 72, r: 9, color: "#16A34A" },
    ],
    7: [
      { cx: 50, cy: 18, r: 9, color: "#DC2626" },
      { cx: 28, cy: 42, r: 9, color: "#1F2937" },
      { cx: 50, cy: 42, r: 9, color: "#16A34A" },
      { cx: 72, cy: 42, r: 9, color: "#1F2937" },
      { cx: 28, cy: 72, r: 9, color: "#DC2626" },
      { cx: 50, cy: 72, r: 9, color: "#1F2937" },
      { cx: 72, cy: 72, r: 9, color: "#DC2626" },
    ],
    8: [
      { cx: 25, cy: 18, r: 8, color: "#DC2626" },
      { cx: 50, cy: 18, r: 8, color: "#1F2937" },
      { cx: 75, cy: 18, r: 8, color: "#DC2626" },
      { cx: 25, cy: 50, r: 8, color: "#16A34A" },
      { cx: 75, cy: 50, r: 8, color: "#16A34A" },
      { cx: 25, cy: 80, r: 8, color: "#DC2626" },
      { cx: 50, cy: 80, r: 8, color: "#1F2937" },
      { cx: 75, cy: 80, r: 8, color: "#DC2626" },
    ],
    9: [
      { cx: 25, cy: 18, r: 8, color: "#DC2626" },
      { cx: 50, cy: 18, r: 8, color: "#1F2937" },
      { cx: 75, cy: 18, r: 8, color: "#16A34A" },
      { cx: 25, cy: 50, r: 8, color: "#1F2937" },
      { cx: 50, cy: 50, r: 8, color: "#DC2626" },
      { cx: 75, cy: 50, r: 8, color: "#1F2937" },
      { cx: 25, cy: 80, r: 8, color: "#16A34A" },
      { cx: 50, cy: 80, r: 8, color: "#1F2937" },
      { cx: 75, cy: 80, r: 8, color: "#DC2626" },
    ],
  };

  const circles = configs[count] || [];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {circles.map((c, i) => (
        <g key={i}>
          <circle cx={c.cx} cy={c.cy} r={c.r} fill={c.color} />
          <circle
            cx={c.cx - c.r * 0.25}
            cy={c.cy - c.r * 0.25}
            r={c.r * 0.35}
            fill="rgba(255,255,255,0.3)"
          />
        </g>
      ))}
    </svg>
  );
}

/** 条子图案（幺鸡用鸟形） */
function TiaoPattern({ count }: { count: number }) {
  if (count === 1) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 幺鸡 - 简化的鸟形 */}
        <path
          d="M50 15 C58 10, 68 12, 70 22 C76 20, 80 24, 76 30 C82 34, 78 42, 70 40 C68 50, 60 58, 52 60 L52 82 L48 82 L48 60 C40 58, 32 50, 30 40 C22 42, 18 34, 24 30 C20 24, 24 20, 30 22 C32 12, 42 10, 50 15Z"
          fill="#16A34A"
        />
        <circle cx="58" cy="25" r="2.5" fill="#1F2937" />
        <path d="M30 42 L20 36 L26 46Z" fill="#DC2626" />
        <path d="M70 42 L80 36 L74 46Z" fill="#DC2626" />
        {/* 竹节底座 */}
        <rect x="42" y="80" width="16" height="8" rx="2" fill="#16A34A" />
        <rect x="40" y="82" width="20" height="2" rx="1" fill="rgba(255,255,255,0.25)" />
      </svg>
    );
  }

  const positions: Record<number, { x: number; y?: number }[]> = {
    2: [{ x: 32 }, { x: 68 }],
    3: [{ x: 22 }, { x: 50 }, { x: 78 }],
    4: [{ x: 18 }, { x: 38 }, { x: 62 }, { x: 82 }],
    5: [{ x: 14 }, { x: 32 }, { x: 50 }, { x: 68 }, { x: 86 }],
    6: [{ x: 14 }, { x: 28 }, { x: 42 }, { x: 58 }, { x: 72 }, { x: 86 }],
    7: [{ x: 12 }, { x: 25 }, { x: 38 }, { x: 50 }, { x: 62 }, { x: 75 }, { x: 88 }],
    8: [{ x: 10 }, { x: 22 }, { x: 34 }, { x: 46 }, { x: 54 }, { x: 66 }, { x: 78 }, { x: 90 }],
    9: [{ x: 10 }, { x: 21 }, { x: 32 }, { x: 43 }, { x: 54 }, { x: 65 }, { x: 76 }, { x: 87 }, { x: 98 }],
  };

  const bars = positions[count] || [];
  const barWidth = count >= 7 ? 5 : count >= 5 ? 6 : 7;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {bars.map((b, i) => {
        const color = i % 2 === 0 ? "#16A34A" : "#DC2626";
        return (
          <g key={i}>
            <rect
              x={b.x - barWidth}
              y={14}
              width={barWidth * 2}
              height={72}
              rx={barWidth * 0.4}
              fill={color}
            />
            {/* 竹节高光 */}
            <rect
              x={b.x - barWidth * 0.6}
              y={18}
              width={barWidth * 0.5}
              height={64}
              rx={barWidth * 0.2}
              fill="rgba(255,255,255,0.2)"
            />
            {/* 竹节线 */}
            <rect
              x={b.x - barWidth - 1}
              y={32}
              width={barWidth * 2 + 2}
              height={2}
              fill="rgba(0,0,0,0.15)"
            />
            <rect
              x={b.x - barWidth - 1}
              y={54}
              width={barWidth * 2 + 2}
              height={2}
              fill="rgba(0,0,0,0.15)"
            />
          </g>
        );
      })}
    </svg>
  );
}

/** 万字牌 */
function WanTile({ value }: { value: number }) {
  const num = WAN_NUMBERS[value];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-1">
      <span
        className="font-black leading-none"
        style={{
          fontSize: "clamp(10px, 24cqw, 22px)",
          color: "#1F2937",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {num}
      </span>
      <span
        className="font-black leading-none mt-0.5"
        style={{
          fontSize: "clamp(8px, 20cqw, 18px)",
          color: "#DC2626",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        万
      </span>
    </div>
  );
}

/** 风牌 */
function WindTile({ value }: { value: number }) {
  const name = WIND_NAMES[value];
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span
        className="font-black select-none"
        style={{
          fontSize: "clamp(14px, 30cqw, 30px)",
          color: "#1F2937",
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** 箭牌 */
function DragonTile({ value }: { value: number }) {
  const name = DRAGON_NAMES[value];
  const color =
    value === 1 ? "#DC2626" : value === 2 ? "#16A34A" : "#3B82F6";

  if (value === 3) {
    // 白板 - 边框样式
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          style={{
            width: "55%",
            height: "55%",
            border: "3px solid #3B82F6",
            borderRadius: 3,
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <span
        className="font-black select-none"
        style={{
          fontSize: "clamp(14px, 30cqw, 30px)",
          color,
          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        {name}
      </span>
    </div>
  );
}

/** 牌面 */
function TileFace({ tile }: { tile: Tile }) {
  switch (tile.suit) {
    case "wan":
      return <WanTile value={tile.value} />;
    case "tong":
      return (
        <div className="w-[80%] h-[80%]">
          <TongPattern count={tile.value} />
        </div>
      );
    case "tiao":
      return (
        <div className="w-[85%] h-[85%]">
          <TiaoPattern count={tile.value} />
        </div>
      );
    case "wind":
      return <WindTile value={tile.value} />;
    case "dragon":
      return <DragonTile value={tile.value} />;
    default:
      return null;
  }
}

export function MahjongTile({
  tile,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  size = "md",
  className,
  style,
}: MahjongTileProps) {
  // 尺寸映射（宽度）
  const sizeMap: Record<string, string> = {
    xs: "22px",
    sm: "28px",
    md: "36px",
    lg: "48px",
    hand: "clamp(36px, 6vw, 56px)",
  };
  const width = sizeMap[size] || sizeMap.md;

  if (faceDown || !tile) {
    return (
      <div
        className={cn(className)}
        style={{ width, ...style }}
      >
        <TileBack />
      </div>
    );
  }

  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={cn(
        "relative select-none flex items-center justify-center",
        onClick && !disabled && "cursor-pointer active:translate-y-0.5",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
      style={{
        width,
        aspectRatio: "0.7",
        borderRadius: 4,
        background: "linear-gradient(180deg, #FFFEF5 0%, #F5F0DC 100%)",
        boxShadow: selected
          ? "0 8px 16px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.08), 0 0 0 3px #FBBF24"
          : "0 3px 8px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.08), 3px 0 0 rgba(180,210,200,0.7)",
        transform: selected ? "translateY(-8px)" : "translateY(0)",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        containerType: "size",
        ...style,
      }}
    >
      {/* 右侧深色边（立体感） */}
      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: 3,
          background: "linear-gradient(180deg, #B8D8CD 0%, #8FB8AA 100%)",
          borderRadius: "0 4px 4px 0",
        }}
      />
      {/* 底部深色边 */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: 3,
          background: "linear-gradient(90deg, #C8E0D6 0%, #A0CCBD 100%)",
          borderRadius: "0 0 4px 4px",
        }}
      />
      {/* 牌面内容 */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <TileFace tile={tile} />
      </div>
    </Component>
  );
}

/** 碰/杠的牌组显示 */
export function MahjongExposed({
  melds,
  size = "sm",
  className,
}: {
  melds: Tile[][];
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {melds.map((meld, idx) => (
        <div key={idx} className="flex gap-0.5">
          {meld.map((tile, tIdx) => (
            <MahjongTile
              key={`${idx}-${tIdx}`}
              tile={tile}
              size={size}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
