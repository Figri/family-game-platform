export interface GameInfo {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  players: string;
  color: string;
  help: {
    play: string;
    rules: string[];
  };
}

export const GAMES: GameInfo[] = [
  {
    id: "doudizhu",
    name: "斗地主",
    emoji: "🃏",
    desc: "经典三人牌类游戏",
    players: "3人",
    color: "#F59E0B",
    help: {
      play:
        "三人游戏，一人为地主，两人为农民。每人发17张牌，留3张底牌给地主。轮流出牌，先出完的一方获胜。",
      rules: [
        "三人游戏，一人为地主，两人为农民",
        "每人发17张牌，留3张底牌给地主",
        "后出的牌必须比前一家大",
        "炸弹可以管任何牌型（除火箭）",
        "火箭（大小王）最大",
        "谁先出完牌谁获胜",
      ],
    },
  },
  {
    id: "guandan",
    name: "掼蛋",
    emoji: "🃏",
    desc: "四人两副牌竞技",
    players: "4人",
    color: "#3B82F6",
    help: {
      play:
        "四人两副牌，两人一组对抗。打完手中所有牌即可升级。升级后下一局打更大的牌，目标是从2打到A。",
      rules: [
        "四人两副牌，两人一组",
        "打完手中牌的一方获胜",
        "获胜方可升级，从2打到A",
        "同花顺、炸弹等特殊牌型可以压制普通牌型",
        "贡牌制度：输方需向赢方进贡最大的牌",
      ],
    },
  },
  {
    id: "tuolaji",
    name: "拖拉机",
    emoji: "🎴",
    desc: "四人对抗，升级争胜",
    players: "4人",
    color: "#8B5CF6",
    help: {
      play:
        "四人两副牌，两人一组。通过出牌争夺分数，分数多的一方升级。目标是尽快从低级升级到高级。",
      rules: [
        "四人两副牌，两人一组",
        "主牌和副牌的概念，主牌可以管副牌",
        "拖拉机（同花色连续对子）是强力牌型",
        "分数牌（5、10、K）决定升级",
        "先升到顶级的队伍获胜",
      ],
    },
  },
  {
    id: "mahjong",
    name: "麻将",
    emoji: "🀄",
    desc: "经典四人麻将",
    players: "4人",
    color: "#10B981",
    help: {
      play:
        "四人对局，使用万、条、筒、风牌、箭牌。不能吃，可以碰、杠（明杠/暗杠/补杠）。一家胡牌后本局结束。",
      rules: [
        "四人对局，使用136张牌",
        "不能吃，可以碰、杠",
        "可以自摸胡牌，也可以点炮胡牌",
        "一家胡牌后本局结束",
        "胡牌公式：4副（顺子/刻子）+ 1对将",
      ],
    },
  },
  {
    id: "gomoku",
    name: "五子棋",
    emoji: "⚫",
    desc: "经典对弈，智力比拼",
    players: "2人",
    color: "#06B6D4",
    help: {
      play:
        "两位玩家轮流在棋盘上放置黑子和白子，率先在横、竖或斜方向上连成五子的一方获胜。",
      rules: [
        "两位玩家轮流下棋",
        "黑棋先行",
        "先在横、竖或斜方向连成五子者获胜",
        "棋盘为15x15方格",
        "落子无悔，不可移动已下的棋子",
      ],
    },
  },
  {
    id: "tetris",
    name: "俄罗斯方块",
    emoji: "🧩",
    desc: "经典消除，挑战高分",
    players: "1~2人",
    color: "linear-gradient(135deg, #F59E0B, #3B82F6, #8B5CF6, #EF4444)",
    help: {
      play:
        "各种形状的方块从上方落下，玩家通过旋转和移动方块使其排列整齐。填满一整行即可消除得分。",
      rules: [
        "方块从顶部自动下落",
        "使用方向键左右移动、上键旋转",
        "填满一整行即可消除",
        "消除多行可获得更高分数",
        "方块堆到顶部则游戏结束",
      ],
    },
  },
  {
    id: "snake",
    name: "贪吃蛇",
    emoji: "🐍",
    desc: "经典玩法，越吃越长",
    players: "1~2人",
    color: "#22C55E",
    help: {
      play:
        "控制蛇在棋盘上移动，吃到食物后蛇身变长。碰到墙壁或自己的身体则游戏结束。",
      rules: [
        "使用方向键控制蛇的移动方向",
        "吃到食物蛇身变长，得分增加",
        "碰到墙壁或蛇身则游戏结束",
        "食物越吃越快，难度递增",
        "挑战更高分数",
      ],
    },
  },
];

export function getGameById(id: string): GameInfo | undefined {
  return GAMES.find((g) => g.id === id);
}