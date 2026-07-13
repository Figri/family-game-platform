"use client";

import { toast } from "sonner";
import { getGameById } from "@/data/games";
import { useRoomStore, type Player } from "@/lib/room-store";
import { useUserStore } from "@/lib/user-store";
import { useEffect } from "react";

interface WaitPageClientProps {
  gameId: string;
}

function getSeatPositions(maxPlayers: number): ("top" | "left" | "right" | "bottom")[] {
  if (maxPlayers <= 2) return ["top", "bottom"];
  if (maxPlayers === 3) return ["top", "left", "bottom"];
  return ["top", "left", "right", "bottom"];
}

function SeatCard({
  player,
  position,
  isMe,
}: {
  player: Player | null;
  position: string;
  isMe: boolean;
}) {
  // 位置样式
  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      position: "absolute",
      top: "0",
      left: "50%",
      transform: "translateX(-50%)",
    },
    left: {
      position: "absolute",
      left: "0",
      top: "50%",
      transform: "translateY(-50%)",
    },
    right: {
      position: "absolute",
      right: "0",
      top: "50%",
      transform: "translateY(-50%)",
    },
    bottom: {
      position: "relative",
    },
  };

  return (
    <div
      className="flex flex-col items-center"
      style={{
        ...positionStyles[position],
        width: "100px",
      }}
    >
      {player ? (
        <div
          className="flex flex-col items-center gap-1 p-3 rounded-2xl shadow-md transition-all"
          style={{
            backgroundColor: player.isAI ? "#F0FDF4" : "#FFF7ED",
            border: isMe ? "3px solid #F97316" : "3px solid transparent",
          }}
        >
          <span className="text-4xl">{player.avatar}</span>
          <span
            className="text-sm font-bold text-center leading-tight"
            style={{ color: "#3D2C1E", maxWidth: "80px" }}
          >
            {player.name}
          </span>
          {player.isHost && (
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: "#F97316" }}
            >
              房主
            </span>
          )}
          {player.isAI ? (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "#DCFCE7", color: "#166534" }}
            >
              AI
            </span>
          ) : (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: "#DBEAFE", color: "#1E40AF" }}
            >
              真人
            </span>
          )}
          {isMe && (
            <span
              className="text-xs font-medium"
              style={{ color: "#F97316" }}
            >
              (我)
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed"
          style={{
            backgroundColor: "#FAFAFA",
            borderColor: "#E5E7EB",
            width: "100px",
            minHeight: "120px",
          }}
        >
          <span className="text-3xl" style={{ color: "#D1D5DB" }}>
            🪑
          </span>
          <span className="text-sm text-center" style={{ color: "#9CA3AF" }}>
            等待玩家...
          </span>
        </div>
      )}
    </div>
  );
}

export function WaitPageClient({ gameId }: WaitPageClientProps) {
  const game = getGameById(gameId);
  const { currentRoom, startGame, clearRoom } = useRoomStore();
  const { guestId } = useUserStore();

  // 如果没有房间或房间不匹配，跳转回房间选择
  useEffect(() => {
    if (!currentRoom || currentRoom.gameId !== gameId || currentRoom.status !== "waiting") {
      window.location.href = `/family-game-platform/game/${gameId}/room`;
    }
  }, [currentRoom, gameId]);

  if (!game || !currentRoom || currentRoom.gameId !== gameId) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-full px-4"
        style={{ backgroundColor: "#FFF9F0" }}
      >
        <div className="text-2xl animate-pulse" style={{ color: "#8B7355" }}>
          加载中...
        </div>
      </div>
    );
  }

  const isHost = currentRoom.hostId === guestId;
  const seats = getSeatPositions(currentRoom.maxPlayers);

  // 分配玩家到座位：真人玩家在前面，AI在后面填充
  const sortedPlayers = [...currentRoom.players].sort((a, b) => {
    if (a.isAI === b.isAI) return 0;
    return a.isAI ? 1 : -1;
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      toast.success("房号已复制到剪贴板");
    } catch {
      // 降级方案
      const textarea = document.createElement("textarea");
      textarea.value = currentRoom.roomCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success("房号已复制到剪贴板");
    }
  };

  const handleStartGame = () => {
    const success = startGame();
    if (success) {
      window.location.href =
        `/family-game-platform/game/${gameId}/play?mode=room&code=${currentRoom.roomCode}`;
    } else {
      toast.error("开始游戏失败");
    }
  };

  const handleLeave = () => {
    clearRoom();
    window.location.href = `/family-game-platform/game/${gameId}/room`;
  };

  // 构建座位列表
  const seatList: (Player | null)[] = seats.map((_, idx) => {
    if (idx < sortedPlayers.length) {
      return sortedPlayers[idx];
    }
    return null;
  });

  // 找到我的座位索引
  const mySeatIndex = seatList.findIndex(
    (p) => p && !p.isAI && p.id === guestId
  );

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FFF9F0" }}>
      {/* 顶部 */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            className="text-2xl hover:scale-110 transition-transform"
            style={{
              minHeight: "56px",
              minWidth: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={handleLeave}
            aria-label="离开房间"
          >
            ←
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold" style={{ color: "#3D2C1E" }}>
              {game.name} - 等待中
            </h1>
          </div>
        </div>
      </header>

      {/* 房间号 */}
      <div className="text-center py-4">
        <div className="text-5xl font-bold tracking-[0.3em] mb-2" style={{ color: "#F97316" }}>
          {currentRoom.roomCode}
        </div>
        <p className="text-lg mb-3" style={{ color: "#8B7355" }}>
          告诉家人这个数字，一起进入房间
        </p>
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-lg shadow-md hover:shadow-lg transition-shadow"
          style={{ backgroundColor: "#3B82F6", minHeight: "48px" }}
          onClick={handleCopyCode}
        >
          📋 复制房号
        </button>
      </div>

      {/* 游戏桌布局 */}
      <main className="flex-1 flex items-center justify-center px-4 py-4">
        <div
          className="relative"
          style={{
            width: "340px",
            height: "340px",
          }}
        >
          {/* 桌面背景 */}
          <div
            className="absolute inset-8 rounded-full shadow-inner"
            style={{
              backgroundColor: "#7C3AED",
              opacity: 0.08,
            }}
          />
          <div
            className="absolute inset-12 rounded-full border-4 border-dashed"
            style={{ borderColor: "#E5E7EB" }}
          />

          {/* 上方座位 */}
          {seats.includes("top") && (
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }}>
              <SeatCard
                player={seatList[seats.indexOf("top")] || null}
                position="top"
                isMe={mySeatIndex === seats.indexOf("top")}
              />
            </div>
          )}

          {/* 左侧座位 */}
          {seats.includes("left") && (
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}>
              <SeatCard
                player={seatList[seats.indexOf("left")] || null}
                position="left"
                isMe={mySeatIndex === seats.indexOf("left")}
              />
            </div>
          )}

          {/* 右侧座位 */}
          {seats.includes("right") && (
            <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}>
              <SeatCard
                player={seatList[seats.indexOf("right")] || null}
                position="right"
                isMe={mySeatIndex === seats.indexOf("right")}
              />
            </div>
          )}

          {/* 下方座位（当前玩家位置） */}
          {seats.includes("bottom") && (
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" }}>
              <SeatCard
                player={seatList[seats.indexOf("bottom")] || null}
                position="bottom"
                isMe={mySeatIndex === seats.indexOf("bottom")}
              />
            </div>
          )}

          {/* 中间游戏信息 */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          >
            <span className="text-5xl mb-2">{game.emoji}</span>
            <span className="text-sm font-medium" style={{ color: "#9CA3AF" }}>
              {currentRoom.players.filter((p) => !p.isAI).length}/{currentRoom.maxPlayers} 真人
            </span>
          </div>
        </div>
      </main>

      {/* 底部按钮 */}
      <div className="px-4 pb-8 pt-4">
        {isHost ? (
          <button
            className="w-full max-w-md mx-auto flex items-center justify-center gap-3 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, #F97316, #EA580C)",
              minHeight: "64px",
              fontSize: "24px",
              fontWeight: "bold",
            }}
            onClick={handleStartGame}
          >
            🎮 开始游戏
          </button>
        ) : (
          <div
            className="w-full max-w-md mx-auto text-center py-4 rounded-2xl"
            style={{ backgroundColor: "#F1F5F9", minHeight: "64px" }}
          >
            <span className="text-xl font-medium" style={{ color: "#64748B" }}>
              等待房主开始游戏...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}