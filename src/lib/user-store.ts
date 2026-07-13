import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** 默认头像列表 */
export const DEFAULT_AVATARS = [
  { id: "cat", emoji: "🐱", label: "🐱 猫咪" },
  { id: "dog", emoji: "🐶", label: "🐶 小狗" },
  { id: "panda", emoji: "🐼", label: "🐼 熊猫" },
  { id: "rabbit", emoji: "🐰", label: "🐰 兔子" },
  { id: "fox", emoji: "🦊", label: "🦊 狐狸" },
  { id: "bear", emoji: "🐻", label: "🐻 熊" },
  { id: "tiger", emoji: "🐯", label: "🐯 老虎" },
  { id: "lion", emoji: "🦁", label: "🦁 狮子" },
  { id: "chicken", emoji: "🐔", label: "🐔 小鸡" },
  { id: "penguin", emoji: "🐧", label: "🐧 企鹅" },
  { id: "dolphin", emoji: "🐬", label: "🐬 海豚" },
  { id: "whale", emoji: "🐋", label: "🐋 鲸鱼" },
];

/** 生成游客ID：玩家 + 4位数字 */
function generateGuestId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `玩家${num}`;
}

export interface RecentGame {
  gameId: string;
  timestamp: number;
}

interface UserState {
  /** 游客ID，不可修改 */
  guestId: string;
  /** 昵称，可修改（1-12字符） */
  nickname: string;
  /** 头像ID */
  avatarId: string;
  /** 最近游戏记录 */
  recentGames: RecentGame[];
  /** 音效开关（默认开） */
  soundEnabled: boolean;
  /** 背景音乐开关（默认关） */
  bgmEnabled: boolean;
  /** 是否已从 localStorage 恢复 */
  _hydrated: boolean;
  /** 修改昵称 */
  setNickname: (name: string) => void;
  /** 选择头像 */
  setAvatar: (avatarId: string) => void;
  /** 获取头像emoji */
  getAvatarEmoji: () => string;
  /** 添加最近游戏记录 */
  addRecentGame: (gameId: string) => void;
  /** 设置音效开关 */
  setSoundEnabled: (enabled: boolean) => void;
  /** 设置背景音乐开关 */
  setBgmEnabled: (enabled: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      guestId: generateGuestId(),
      nickname: "",
      avatarId: "cat",
      recentGames: [],
      soundEnabled: true,
      bgmEnabled: false,
      _hydrated: false,
      setNickname: (name) => {
        const trimmed = name.trim();
        if (trimmed.length >= 1 && trimmed.length <= 12) {
          set({ nickname: trimmed });
        }
      },
      setAvatar: (avatarId) => set({ avatarId }),
      getAvatarEmoji: () => {
        const { avatarId } = get();
        const found = DEFAULT_AVATARS.find((a) => a.id === avatarId);
        return found ? found.emoji : "👤";
      },
      addRecentGame: (gameId) =>
        set((state) => {
          const filtered = state.recentGames.filter(
            (g) => g.gameId !== gameId
          );
          return {
            recentGames: [
              { gameId, timestamp: Date.now() },
              ...filtered,
            ].slice(0, 10),
          };
        }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setBgmEnabled: (enabled) => set({ bgmEnabled: enabled }),
    }),
    {
      name: "family-game-user",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);