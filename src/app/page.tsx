"use client";

import { SettingsButton } from "@/components/settings-button";
import { GameCard, type GameCardData } from "@/components/game-card";
import { useUserStore } from "@/lib/user-store";

const GAMES: GameCardData[] = [
  {
    id: "doudizhu",
    name: "斗地主",
    emoji: "🃏",
    description: "经典三人牌类游戏，老少皆宜",
    href: "/games/doudizhu",
  },
  {
    id: "guandan",
    name: "掼蛋",
    emoji: "🂡",
    description: "四人两副牌，策略与配合的竞技",
    href: "/games/guandan",
  },
  {
    id: "tuolaji",
    name: "拖拉机",
    emoji: "🎮",
    description: "经典扑克游戏，两人一组的对抗",
    href: "/games/tuolaji",
  },
  {
    id: "mahjong",
    name: "四川麻将",
    emoji: "🀄",
    description: "四人四圈麻将，实打实练",
    href: "/games/mahjong",
  },
  {
    id: "gomoku",
    name: "五子棋",
    emoji: "⚫",
    description: "五子连珠，简单易上手的棋类游戏",
    href: "/games/gomoku",
  },
  {
    id: "tetris",
    name: "俄罗斯方块",
    emoji: "🟥",
    description: "经典消除游戏，老少皆宜",
    href: "/games/tetris",
  },
  {
    id: "snake",
    name: "贪吃蛇",
    emoji: "🐍",
    description: "经典休闲游戏，越吃越长",
    href: "/games/snake",
  },
];

export default function HomePage() {
  const { guestId, nickname, getAvatarEmoji } = useUserStore();
  const displayName = nickname || guestId;

  return (
    <div className="flex flex-col flex-1 min-h-full bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏠</span>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight elderly-mode:text-2xl">
              家庭游戏平台
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              {getAvatarEmoji()} {displayName}
            </span>
          </div>
        </div>
        <SettingsButton />
      </header>

      {/* 游戏列表 */}
      <main className="flex-1 px-4 py-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground elderly-mode:text-3xl">
          选择游戏
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </main>

      {/* 底部 */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 全家一起玩
      </footer>
    </div>
  );
}
