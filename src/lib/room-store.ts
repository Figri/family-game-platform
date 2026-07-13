import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isAI: boolean;
  isOnline: boolean;
  isHost: boolean;
}

export interface Room {
  roomCode: string;
  gameId: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: "waiting" | "playing";
}

/** AI 头像池 */
const AI_AVATARS = ["🤖", "🦊", "🐼", "🐰", "🦁", "🐯", "🐨", "🦄", "🐸", "🐵"];
/** AI 名字池 */
const AI_NAMES = [
  "小智同学",
  "聪明豆",
  "欢乐熊",
  "机智猫",
  "快乐虎",
  "智慧龙",
  "灵巧猴",
  "勇敢兔",
  "淡定龟",
  "活泼鱼",
];

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateAIPlayer(index: number): Player {
  return {
    id: `ai-${Date.now()}-${index}`,
    name: AI_NAMES[index % AI_NAMES.length],
    avatar: AI_AVATARS[index % AI_AVATARS.length],
    isAI: true,
    isOnline: true,
    isHost: false,
  };
}

/** 根据游戏ID解析最大玩家数 */
function parseMaxPlayers(playersStr: string): number {
  const match = playersStr.match(/(\d+)/g);
  if (!match) return 4;
  return Math.max(...match.map(Number));
}

interface RoomState {
  currentRoom: Room | null;
  createRoom: (gameId: string, playerName: string, playerAvatar: string, playerId: string, maxPlayers: number) => Room;
  joinRoom: (roomCode: string, playerName: string, playerAvatar: string, playerId: string) => boolean;
  addAIPlayers: () => void;
  startGame: () => boolean;
  playerDisconnect: (playerId: string) => void;
  playerReconnect: (playerId: string) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      currentRoom: null,

      createRoom: (gameId, playerName, playerAvatar, playerId, maxPlayers) => {
        const roomCode = generateCode();
        const hostPlayer: Player = {
          id: playerId,
          name: playerName,
          avatar: playerAvatar,
          isAI: false,
          isOnline: true,
          isHost: true,
        };
        const room: Room = {
          roomCode,
          gameId,
          hostId: playerId,
          players: [hostPlayer],
          maxPlayers,
          status: "waiting",
        };
        set({ currentRoom: room });
        return room;
      },

      joinRoom: (roomCode, playerName, playerAvatar, playerId) => {
        const { currentRoom } = get();
        if (!currentRoom) return false;
        if (currentRoom.roomCode !== roomCode) return false;
        if (currentRoom.players.length >= currentRoom.maxPlayers) return false;
        if (currentRoom.status !== "waiting") return false;
        if (currentRoom.players.some((p) => p.id === playerId)) return false;

        const newPlayer: Player = {
          id: playerId,
          name: playerName,
          avatar: playerAvatar,
          isAI: false,
          isOnline: true,
          isHost: false,
        };

        set({
          currentRoom: {
            ...currentRoom,
            players: [...currentRoom.players, newPlayer],
          },
        });
        return true;
      },

      addAIPlayers: () => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        const currentCount = currentRoom.players.length;
        const need = currentRoom.maxPlayers - currentCount;
        if (need <= 0) return;

        const aiPlayers: Player[] = [];
        for (let i = 0; i < need; i++) {
          aiPlayers.push(generateAIPlayer(currentCount + i));
        }

        set({
          currentRoom: {
            ...currentRoom,
            players: [...currentRoom.players, ...aiPlayers],
          },
        });
      },

      startGame: () => {
        const { currentRoom, addAIPlayers } = get();
        if (!currentRoom) return false;
        if (currentRoom.hostId !== currentRoom.players.find((p) => !p.isAI)?.id) {
          return false;
        }

        // 自动补AI
        addAIPlayers();

        // 更新状态为 playing
        const room = get().currentRoom;
        if (!room) return false;

        set({
          currentRoom: {
            ...room,
            status: "playing",
          },
        });
        return true;
      },

      playerDisconnect: (playerId) => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        set({
          currentRoom: {
            ...currentRoom,
            players: currentRoom.players.map((p) =>
              p.id === playerId ? { ...p, isOnline: false } : p
            ),
          },
        });
      },

      playerReconnect: (playerId) => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        set({
          currentRoom: {
            ...currentRoom,
            players: currentRoom.players.map((p) =>
              p.id === playerId ? { ...p, isOnline: true } : p
            ),
          },
        });
      },

      clearRoom: () => set({ currentRoom: null }),
    }),
    {
      name: "family-game-room",
    }
  )
);