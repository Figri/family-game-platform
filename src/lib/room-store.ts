import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  isAI: boolean;
  isHost: boolean;
  isOnline: boolean;
  /** \u662F\u5426\u88AB\u6258\u7BA1\u7ED9AI */
  isAIManaged: boolean;
}

export interface Room {
  /** 6\u4F4D\u6570\u5B57\u623F\u53F7 */
  roomCode: string;
  /** \u623F\u95F4\u72B6\u6001 */
  status: RoomStatus;
  /** \u6E38\u620F\u7C7B\u578B */
  gameType: string;
  /** \u73A9\u5BB6\u5217\u8868 */
  players: Player[];
  /** \u6700\u5927\u73A9\u5BB6\u6570 */
  maxPlayers: number;
  /** AI\u8865\u4F4D\u5F00\u5173 */
  aiFillEnabled: boolean;
  /** \u623F\u4E3BID */
  hostId: string;
  /** \u521B\u5EFA\u65F6\u95F4 */
  createdAt: number;
}

interface RoomState {
  /** \u5F53\u524D\u623F\u95F4 */
  currentRoom: Room | null;
  /** \u751F\u62106\u4F4D\u623F\u53F7 */
  generateRoomCode: () => string;
  /** \u521B\u5EFA\u623F\u95F4 */
  createRoom: (gameType: string, hostPlayer: Player, maxPlayers: number) => Room;
  /** \u52A0\u5165\u623F\u95F4 */
  joinRoom: (roomCode: string, player: Player) => boolean;
  /** \u79BB\u5F00\u623F\u95F4 */
  leaveRoom: (playerId: string) => void;
  /** \u8BBE\u7F6EAI\u8865\u4F4D */
  setAIFill: (enabled: boolean) => void;
  /** \u5207\u6362\u73A9\u5BB6\u5728\u7EBF\u72B6\u6001 */
  setPlayerOnline: (playerId: string, online: boolean) => void;
  /** \u8BBE\u7F6E\u73A9\u5BB6\u6258\u7BA1 */
  setPlayerAIManaged: (playerId: string, managed: boolean) => void;
  /** \u6E05\u9664\u623F\u95F4 */
  clearRoom: () => void;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  currentRoom: null,

  generateRoomCode: () => generateCode(),

  createRoom: (gameType, hostPlayer, maxPlayers) => {
    const roomCode = generateCode();
    const room: Room = {
      roomCode,
      status: "waiting",
      gameType,
      players: [hostPlayer],
      maxPlayers,
      aiFillEnabled: false,
      hostId: hostPlayer.id,
      createdAt: Date.now(),
    };
    set({ currentRoom: room });
    return room;
  },

  joinRoom: (roomCode, player) => {
    const { currentRoom } = get();
    if (!currentRoom || currentRoom.roomCode !== roomCode) return false;
    if (currentRoom.players.length >= currentRoom.maxPlayers) return false;
    if (currentRoom.status !== "waiting") return false;
    if (currentRoom.players.some((p) => p.id === player.id)) return false;

    set({
      currentRoom: {
        ...currentRoom,
        players: [...currentRoom.players, player],
      },
    });
    return true;
  },

  leaveRoom: (playerId) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    const remaining = currentRoom.players.filter((p) => p.id !== playerId);

    if (remaining.length === 0) {
      set({ currentRoom: null });
      return;
    }

    // \u5982\u679C\u623F\u4E3B\u79BB\u5F00\uFF0C\u8F6C\u8BA9\u623F\u4E3B
    const newHostId =
      currentRoom.hostId === playerId ? remaining[0].id : currentRoom.hostId;

    set({
      currentRoom: {
        ...currentRoom,
        players: remaining.map((p) => ({
          ...p,
          isHost: p.id === newHostId,
        })),
        hostId: newHostId,
      },
    });
  },

  setAIFill: (enabled) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    set({
      currentRoom: {
        ...currentRoom,
        aiFillEnabled: enabled,
      },
    });
  },

  setPlayerOnline: (playerId, online) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.map((p) =>
          p.id === playerId ? { ...p, isOnline: online } : p
        ),
      },
    });
  },

  setPlayerAIManaged: (playerId, managed) => {
    const { currentRoom } = get();
    if (!currentRoom) return;
    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.map((p) =>
          p.id === playerId ? { ...p, isAIManaged: managed } : p
        ),
      },
    });
  },

  clearRoom: () => set({ currentRoom: null }),
}));
