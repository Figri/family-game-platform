import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GameRecord {
  /** \u6E38\u620F\u7C7B\u578B */
  gameType: string;
  /** \u662F\u5426\u80DC\u5229 */
  won: boolean;
  /** \u6E38\u620F\u65F6\u95F4\u6233 */
  timestamp: number;
}

interface StatsState {
  /** \u603B\u5C40\u6570 */
  totalGames: number;
  /** \u80DC\u5229\u6570 */
  totalWins: number;
  /** \u8FDE\u7EED\u80DC\u5229\u6B21\u6570 */
  winStreak: number;
  /** \u6700\u5927\u8FDE\u80DC */
  maxWinStreak: number;
  /** \u6700\u8FD110\u5C40\u6218\u7EE9 */
  recentGames: GameRecord[];
  /** \u6DFB\u52A0\u4E00\u5C40\u6218\u7EE9 */
  addGame: (gameType: string, won: boolean) => void;
  /** \u83B7\u53D6\u80DC\u7387 */
  getWinRate: () => number;
  /** \u83B7\u53D6\u4ECA\u65E5\u6218\u7EE9 */
  getTodayGames: () => GameRecord[];
  /** \u83B7\u53D6\u672C\u5468\u6218\u7EE9 */
  getWeekGames: () => GameRecord[];
  /** \u83B7\u53D6\u6392\u884C\u699C\u6570\u636E */
  getLeaderboard: (period: "today" | "week" | "all") => {
    games: number;
    wins: number;
    winRate: number;
    streak: number;
  };
  /** \u91CD\u7F6E\u7EDF\u8BA1 */
  resetStats: () => void;
}

function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getWeekStart(): number {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      totalGames: 0,
      totalWins: 0,
      winStreak: 0,
      maxWinStreak: 0,
      recentGames: [],

      addGame: (gameType, won) => {
        const state = get();
        const newStreak = won ? state.winStreak + 1 : 0;
        const newMaxStreak = Math.max(state.maxWinStreak, newStreak);
        const record: GameRecord = {
          gameType,
          won,
          timestamp: Date.now(),
        };
        set({
          totalGames: state.totalGames + 1,
          totalWins: state.totalWins + (won ? 1 : 0),
          winStreak: newStreak,
          maxWinStreak: newMaxStreak,
          recentGames: [record, ...state.recentGames].slice(0, 10),
        });
      },

      getWinRate: () => {
        const { totalGames, totalWins } = get();
        if (totalGames === 0) return 0;
        return Math.round((totalWins / totalGames) * 100);
      },

      getTodayGames: () => {
        const { recentGames } = get();
        const todayStart = getTodayStart();
        return recentGames.filter((g) => g.timestamp >= todayStart);
      },

      getWeekGames: () => {
        const { recentGames } = get();
        const weekStart = getWeekStart();
        return recentGames.filter((g) => g.timestamp >= weekStart);
      },

      getLeaderboard: (period) => {
        const state = get();
        let games: GameRecord[];

        switch (period) {
          case "today":
            games = state.getTodayGames();
            break;
          case "week":
            games = state.getWeekGames();
            break;
          case "all":
          default:
            games = state.recentGames;
            break;
        }

        const total = games.length;
        const wins = games.filter((g) => g.won).length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        // \u8BA1\u7B97\u8BE5\u65F6\u6BB5\u7684\u8FDE\u80DC
        let streak = 0;
        for (const g of games) {
          if (g.won) streak++;
          else break;
        }

        return { games: total, wins, winRate, streak };
      },

      resetStats: () =>
        set({
          totalGames: 0,
          totalWins: 0,
          winStreak: 0,
          maxWinStreak: 0,
          recentGames: [],
        }),
    }),
    {
      name: "family-game-stats",
    }
  )
);
