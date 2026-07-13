"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getGameById } from "@/data/games";

interface PlayPageClientProps {
  gameId: string;
}

/** 游戏ID到实际路由路径的映射 */
const GAME_ROUTE_MAP: Record<string, string> = {
  gomoku: "/family-game-platform/game/gomoku",
  snake: "/family-game-platform/game/snake",
  tetris: "/family-game-platform/game/tetris",
  doudizhu: "/family-game-platform/game/doudizhu",
  mahjong: "/family-game-platform/game/mahjong",
  guandan: "/family-game-platform/game/guandan",
  tuolaji: "/family-game-platform/game/tractor",
  tractor: "/family-game-platform/game/tractor",
};

/**
 * 统一游戏入口中转页
 * 根据 gameId 和 mode 参数，重定向到对应游戏的实际页面
 */
export function PlayPageClient({ gameId }: PlayPageClientProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "pve";

  useEffect(() => {
    const game = getGameById(gameId);
    if (!game) {
      window.location.href = "/family-game-platform/";
      return;
    }

    const basePath = GAME_ROUTE_MAP[gameId];
    if (!basePath) {
      window.location.href = "/family-game-platform/";
      return;
    }

    // 构建查询参数
    const params = new URLSearchParams();

    // 根据游戏类型设置正确的 mode 参数
    switch (gameId) {
      case "gomoku":
        params.set("mode", mode === "room" ? "pve" : mode);
        break;
      case "snake":
        params.set("mode", mode === "pve" || mode === "room" ? "single" : mode);
        break;
      case "tetris":
        params.set("mode", mode === "pve" || mode === "room" ? "single" : mode);
        break;
      default:
        // 牌类游戏
        params.set("mode", mode);
        break;
    }

    // 保留 code 参数（好友房用）
    const code = searchParams.get("code");
    if (code) {
      params.set("code", code);
    }

    const queryString = params.toString();
    const targetUrl = queryString ? `${basePath}?${queryString}` : basePath;

    window.location.href = targetUrl;
  }, [gameId, mode, searchParams]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-full"
      style={{ backgroundColor: "#FFF9F0" }}
    >
      <span className="text-6xl mb-4 animate-pulse">🎮</span>
      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "#3D2C1E" }}
      >
        正在进入游戏...
      </h1>
      <p className="text-lg" style={{ color: "#8B7355" }}>
        请稍候
      </p>
    </div>
  );
}