import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RoomStatus = "loading" | "waiting" | "connected" | "reconnecting" | "not-found" | "error";

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

/**
 * 查找 localStorage 中某个房间的数据。
 * 因为 localStorage 是同源的，任何人都能读到所有房间数据（本地模拟方案）。
 */
export function findRoomInStorage(roomCode: string): Room | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("family-game-room");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (!state?.currentRoom) return null;
    if (state.currentRoom.roomCode === roomCode) {
      return state.currentRoom as Room;
    }
    return null;
  } catch {
    return null;
  }
}

interface RoomState {
  currentRoom: Room | null;
  /** store 是否已从 localStorage 恢复 */
  _hydrated: boolean;
  roomStatus: RoomStatus;
  createRoom: (gameId: string, playerName: string, playerAvatar: string, playerId: string, maxPlayers: number) => Room;
  joinRoom: (roomCode: string, playerName: string, playerAvatar: string, playerId: string) => boolean;
  joinRoomFromStorage: (roomCode: string, playerName: string, playerAvatar: string, playerId: string) => boolean;
  addAIPlayers: () => void;
  startGame: () => boolean;
  playerDisconnect: (playerId: string) => void;
  playerReconnect: (playerId: string) => void;
  clearRoom: () => void;
  setRoomStatus: (status: RoomStatus) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      currentRoom: null,
      _hydrated: false,
      roomStatus: "loading" as RoomStatus,

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
        set({ currentRoom: room, roomStatus: "waiting" });
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
          roomStatus: "connected",
        });
        return true;
      },

      /**
       * 从 localStorage 中查找房间并加入。
       * 用于"加入房间"场景：加入者自己没有 currentRoom，
       * 需要从存储中找到房主创建的房间。
       */
      joinRoomFromStorage: (roomCode, playerName, playerAvatar, playerId) => {
        const room = findRoomInStorage(roomCode);
        if (!room) return false;
        if (room.players.length >= room.maxPlayers) return false;
        if (room.status !== "waiting") return false;
        if (room.players.some((p) => p.id === playerId)) return false;

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
            ...room,
            players: [...room.players, newPlayer],
          },
          roomStatus: "connected",
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

      clearRoom: () => set({ currentRoom: null, roomStatus: "loading" }),
      setRoomStatus: (status) => set({ roomStatus: status }),
    }),
    {
      name: "family-game-room",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          // 如果有房间且状态是 waiting，设为 waiting
          if (state.currentRoom) {
            state.roomStatus = "waiting";
          } else {
            state.roomStatus = "loading";
          }
        }
      },
    }
  )
);
