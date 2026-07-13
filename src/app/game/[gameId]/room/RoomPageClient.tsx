"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getGameById } from "@/data/games";
import { useRoomStore } from "@/lib/room-store";
import { useUserStore } from "@/lib/user-store";

interface RoomPageClientProps {
  gameId: string;
}

export function RoomPageClient({ gameId }: RoomPageClientProps) {
  const game = getGameById(gameId);
  const { createRoom, joinRoom, currentRoom } = useRoomStore();
  const { guestId, nickname, getAvatarEmoji } = useUserStore();

  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");

  if (!game) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-full px-4"
        style={{ backgroundColor: "#FFF9F0" }}
      >
        <span className="text-6xl mb-4">😕</span>
        <h1 className="text-2xl font-bold mb-4" style={{ color: "#3D2C1E" }}>
          游戏未找到
        </h1>
        <button
          className="text-white font-bold text-xl px-8 py-3 rounded-2xl"
          style={{ backgroundColor: "#F97316", minHeight: "56px" }}
          onClick={() => { window.location.href = "/family-game-platform/"; }}
        >
          返回首页
        </button>
      </div>
    );
  }

  // 解析最大玩家数
  const playerMatch = game.players.match(/(\d+)/g);
  const maxPlayers = playerMatch ? Math.max(...playerMatch.map(Number)) : 4;

  const handleCreateRoom = () => {
    const room = createRoom(
      gameId,
      nickname || guestId,
      getAvatarEmoji(),
      guestId,
      maxPlayers
    );
    toast.success(`房间创建成功！房号：${room.roomCode}`);
    window.location.href = `/family-game-platform/game/${gameId}/wait`;
  };

  const handleJoinRoom = () => {
    const code = roomCodeInput.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("请输入6位数字房号");
      return;
    }

    if (!currentRoom || currentRoom.roomCode !== code) {
      toast.error("房间不存在，请检查房号");
      return;
    }

    if (currentRoom.gameId !== gameId) {
      toast.error("该房号不是当前游戏的房间");
      return;
    }

    const success = joinRoom(code, nickname || guestId, getAvatarEmoji(), guestId);
    if (success) {
      toast.success("加入房间成功！");
      window.location.href = `/family-game-platform/game/${gameId}/wait`;
    } else {
      toast.error("加入失败，房间可能已满或已开始");
    }
  };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FFF9F0" }}>
      {/* 顶部 */}
      <header className="flex items-center gap-3 px-4 sm:px-6 py-4">
        <button
          className="text-2xl hover:scale-110 transition-transform"
          style={{
            minHeight: "56px",
            minWidth: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => { window.location.href = `/family-game-platform/game/${gameId}/select`; }}
          aria-label="返回"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold" style={{ color: "#3D2C1E" }}>
          好友房
        </h1>
      </header>

      {/* 中间内容 */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-8">
        {/* 游戏图标 */}
        <div className="text-center">
          <span className="text-8xl block mb-4">{game.emoji}</span>
          <h2 className="text-3xl font-bold mb-2" style={{ color: "#3D2C1E" }}>
            {game.name} - 好友房
          </h2>
          <p className="text-xl" style={{ color: "#8B7355" }}>
            和家人朋友一起玩
          </p>
        </div>

        {/* 两个大按钮 */}
        <div className="w-full max-w-md flex flex-col gap-5">
          {/* 创建房间 */}
          <button
            className="flex flex-col items-center justify-center rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              minHeight: "120px",
            }}
            onClick={handleCreateRoom}
          >
            <span className="text-4xl mb-2">🏠</span>
            <span className="text-2xl font-bold">创建房间</span>
            <span className="text-base opacity-90 mt-1">
              创建房间，邀请家人加入
            </span>
          </button>

          {/* 加入房间 */}
          {!showJoinInput ? (
            <button
              className="flex flex-col items-center justify-center rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                minHeight: "120px",
              }}
              onClick={() => setShowJoinInput(true)}
            >
              <span className="text-4xl mb-2">🚪</span>
              <span className="text-2xl font-bold">加入房间</span>
              <span className="text-base opacity-90 mt-1">
                输入房号，加入好友的房间
              </span>
            </button>
          ) : (
            <div
              className="flex flex-col items-center rounded-2xl shadow-lg p-6 gap-4"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <span className="text-2xl font-bold" style={{ color: "#3D2C1E" }}>
                输入6位房号
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={roomCodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRoomCodeInput(val);
                }}
                className="w-full text-center text-4xl font-bold tracking-[0.5em] rounded-2xl border-2 outline-none py-4"
                style={{
                  borderColor: "#3B82F6",
                  backgroundColor: "#F8FAFC",
                  color: "#3D2C1E",
                  minHeight: "72px",
                }}
                autoFocus
              />
              <div className="flex w-full gap-3">
                <button
                  className="flex-1 text-lg font-medium rounded-2xl transition-colors"
                  style={{
                    backgroundColor: "#F1F5F9",
                    color: "#64748B",
                    minHeight: "56px",
                  }}
                  onClick={() => {
                    setShowJoinInput(false);
                    setRoomCodeInput("");
                  }}
                >
                  取消
                </button>
                <button
                  className="flex-1 text-white text-lg font-bold rounded-2xl transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: "#3B82F6",
                    minHeight: "56px",
                  }}
                  onClick={handleJoinRoom}
                >
                  进入房间
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}