import { create } from "zustand";
import { persist } from "zustand/middleware";

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

/** 生成游客ID */
function generateGuestId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `玩家${num}`;
}

interface UserState {
  /** 游客ID，不可修改 */
  guestId: string;
  /** 昵称，可修改 */
  nickname: string;
  /** 头像ID */
  avatarId: string;
  /** 修改昵称 */
  setNickname: (name: string) => void;
  /** 选择头像 */
  setAvatar: (avatarId: string) => void;
  /** 获取头像emoji */
  getAvatarEmoji: () => string;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      guestId: generateGuestId(),
      nickname: "",
      avatarId: "cat",
      setNickname: (name) => set({ nickname: name }),
      setAvatar: (avatarId) => set({ avatarId }),
      getAvatarEmoji: () => {
        const { avatarId } = get();
        const found = DEFAULT_AVATARS.find((a) => a.id === avatarId);
        return found ? found.emoji : "👤";
      },
    }),
    {
      name: "family-game-user",
    }
  )
);
