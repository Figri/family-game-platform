"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUserStore, DEFAULT_AVATARS } from "@/lib/user-store";
import { GAMES, getGameById } from "@/data/games";
import { GameCard } from "@/components/game-card";

export default function HomePage() {
  const {
    guestId,
    nickname,
    avatarId,
    setNickname,
    setAvatar,
    getAvatarEmoji,
    recentGames,
  } = useUserStore();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname || "");

  const displayName = nickname || guestId;
  const avatarEmoji = getAvatarEmoji();

  // 今日推荐：根据日期随机选一个游戏
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const todayGame = GAMES[seed % GAMES.length];

  // 最近玩过的第一个游戏
  const recentGame = recentGames.length > 0 ? getGameById(recentGames[0].gameId) : null;

  const handleNicknameSave = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      toast.error("昵称需要1-12个字符");
      return;
    }
    setNickname(trimmed);
    setEditingNickname(false);
    toast.success("昵称修改成功");
  };

  const handleAvatarClick = () => {
    const currentIdx = DEFAULT_AVATARS.findIndex((a) => a.id === avatarId);
    const nextIdx = (currentIdx + 1) % DEFAULT_AVATARS.length;
    setAvatar(DEFAULT_AVATARS[nextIdx].id);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-full" style={{ backgroundColor: "#FFF9F0" }}>
      {/* 顶部区域 */}
      <header className="flex flex-col px-4 sm:px-6 pt-4 pb-2">
        {/* 标题行 - 独占一整行 */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: "#F97316" }}
            >
              小游戏大全
            </h1>
            <span className="text-sm" style={{ color: "#C4956A" }}>
              诗诗出品
            </span>
          </div>
        </div>
        {/* 第二行：用户信息 + 设置/帮助 */}
        <div className="flex flex-col gap-2">
          {/* 第一行：Logo emoji + 用户信息卡 */}
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎲</span>
            {/* 移动端用户信息 */}
            <div
              className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-2xl cursor-pointer"
              style={{ backgroundColor: "#FFF1E6" }}
              onClick={() => {
                setNicknameInput(nickname || "");
                setEditingNickname(true);
              }}
            >
              <span className="text-2xl leading-none">{avatarEmoji}</span>
              {!editingNickname ? (
                <div className="flex items-center gap-1">
                  <span className="text-base font-medium" style={{ color: "#3D2C1E" }}>
                    {displayName}
                  </span>
                  <span className="text-base" style={{ color: "#8B7355" }}>✏️</span>
                </div>
              ) : (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="px-2 py-1 rounded-lg text-base border-2 outline-none"
                    style={{
                      borderColor: "#F3D9C1",
                      backgroundColor: "#FFFFFF",
                      color: "#3D2C1E",
                      minWidth: "100px",
                    }}
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNicknameSave();
                      if (e.key === "Escape") setEditingNickname(false);
                    }}
                    autoFocus
                    maxLength={12}
                  />
                  <button
                    className="px-3 py-1 rounded-lg text-base font-medium text-white"
                    style={{ backgroundColor: "#F97316", minHeight: "36px" }}
                    onClick={handleNicknameSave}
                  >
                    确定
                  </button>
                </div>
              )}
            </div>
            {/* 桌面端用户信息卡 */}
            <div
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              style={{ backgroundColor: "#FFF1E6" }}
              onClick={() => {
                setNicknameInput(nickname || "");
                setEditingNickname(true);
              }}
            >
              <button
                className="text-3xl leading-none hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAvatarClick();
                }}
              >
                {avatarEmoji}
              </button>
              {!editingNickname ? (
                <div className="flex items-center gap-1">
                  <span className="text-lg font-medium" style={{ color: "#3D2C1E" }}>
                    {displayName}
                  </span>
                  <span className="text-lg" style={{ color: "#8B7355" }}>
                    ✏️
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    className="px-3 py-1 rounded-lg text-lg border-2 outline-none"
                    style={{
                      borderColor: "#F3D9C1",
                      backgroundColor: "#FFFFFF",
                      color: "#3D2C1E",
                      minWidth: "120px",
                    }}
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNicknameSave();
                      if (e.key === "Escape") setEditingNickname(false);
                    }}
                    autoFocus
                    maxLength={12}
                  />
                  <button
                    className="px-3 py-1 rounded-lg text-base font-medium text-white"
                    style={{ backgroundColor: "#F97316", minHeight: "36px" }}
                    onClick={handleNicknameSave}
                  >
                    确定
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 第二行：设置和帮助 */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-base sm:text-lg font-medium text-white transition-shadow hover:shadow-md whitespace-nowrap"
              style={{ backgroundColor: "#F97316", minHeight: "48px" }}
              onClick={() => { window.location.href = "/family-game-platform/settings/"; }}
            >
              ⚙️ 设置
            </button>
            <button
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-base sm:text-lg font-medium transition-shadow hover:shadow-md whitespace-nowrap"
              style={{
                backgroundColor: "#FFF1E6",
                color: "#92400E",
                minHeight: "48px",
              }}
              onClick={() => { window.location.href = "/family-game-platform/help/"; }}
            >
              ❓ 帮助
            </button>
          </div>
        </div>
      </header>
      {/* 今日推荐 + 最近玩过 */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 今日推荐 */}
          <div className="flex-1">
            <h2
              className="text-xl font-bold mb-3"
              style={{ color: "#3D2C1E" }}
            >
              今日推荐
            </h2>
            <div
              className="rounded-2xl p-6 flex flex-col items-center text-white shadow-lg"
              style={{
                background: todayGame.color.startsWith("linear")
                  ? todayGame.color
                  : `linear-gradient(135deg, ${todayGame.color}, ${todayGame.color}dd)`,
              }}
            >
              <span className="text-6xl mb-3">{todayGame.emoji}</span>
              <h3 className="text-2xl font-bold mb-2">{todayGame.name}</h3>
              <p className="text-lg opacity-90 mb-4">{todayGame.desc}</p>
              <button
                className="bg-white/25 backdrop-blur-sm text-white font-bold text-xl px-8 py-3 rounded-2xl hover:bg-white/35 transition-colors"
                style={{ minHeight: "56px" }}
                onClick={() =>
                  { window.location.href = `/family-game-platform/game/${todayGame.id}/select/`; }
                }
              >
                去玩一局
              </button>
            </div>
          </div>

          {/* 最近玩过 */}
          <div className="lg:w-80">
            <h2
              className="text-xl font-bold mb-3"
              style={{ color: "#3D2C1E" }}
            >
              最近玩过
            </h2>
            <div
              className="rounded-2xl p-6 shadow-md flex flex-col items-center justify-center"
              style={{ backgroundColor: "#FFFFFF", minHeight: "200px" }}
            >
              {recentGame ? (
                <>
                  <span className="text-5xl mb-2">{recentGame.emoji}</span>
                  <h3 className="text-xl font-bold mb-1" style={{ color: "#3D2C1E" }}>
                    {recentGame.name}
                  </h3>
                  <p className="text-base mb-4" style={{ color: "#8B7355" }}>
                    {formatTime(recentGames[0].timestamp)}
                  </p>
                  <button
                    className="text-white font-bold text-lg px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: recentGame.color.startsWith("linear")
                        ? "#F97316"
                        : recentGame.color,
                      minHeight: "56px",
                    }}
                    onClick={() =>
                      { window.location.href = `/family-game-platform/game/${recentGame.id}/select/`; }
                    }
                  >
                    继续游戏
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <span className="text-5xl mb-3 block">🎮</span>
                  <p className="text-lg mb-4" style={{ color: "#8B7355" }}>
                    还没有玩过游戏
                  </p>
                  <button
                    className="text-white font-bold text-lg px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#F97316", minHeight: "56px" }}
                    onClick={() => {
                      const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)];
                      window.location.href = `/family-game-platform/game/${randomGame.id}/select/`;
                    }}
                  >
                    再玩一局
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 游戏卡片区域 */}
      <div className="px-4 sm:px-6 py-4 flex-1">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "#3D2C1E" }}
        >
          选择游戏
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              name={game.name}
              emoji={game.emoji}
              desc={game.desc}
              players={game.players}
              color={game.color}
              onClick={() => { window.location.href = `/family-game-platform/game/${game.id}/select/`; }}
            />
          ))}
        </div>
      </div>

      {/* 底部 */}
      <footer
        className="text-center py-6 text-lg"
        style={{ color: "#8B7355", borderTop: "1px solid #F3D9C1" }}
      >
        小游戏大全 · 诗诗出品
      </footer>
    </div>
  );
}