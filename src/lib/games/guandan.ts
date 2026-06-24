// ===================== 掼蛋游戏逻辑 =====================

import {
  type PokerCard,
  type Suit,
  SUITS,
  NORMAL_RANKS,
  RANK_VALUES,
  getCardValue,
  compareCards,
  sortCards,
  isRedSuit,
} from "./poker";

// ===================== 类型定义 =====================

/** 玩家索引：0=下方玩家(自己)，1=右对手，2=上对家，3=左对手 */
export type PlayerIndex = 0 | 1 | 2 | 3;

/** 游戏阶段 */
export type GamePhase =
  | "tribute"      // 进贡阶段
  | "playing"      // 出牌阶段
  | "finished";    // 游戏结束

/** 牌型分类（掼蛋专用） */
export type GuandanHandType =
  | "none"
  | "single"
  | "pair"
  | "triple"
  | "triple-with-pair"
  | "straight"
  | "flush"
  | "bomb"
  | "rocket";

/** 牌型结果 */
export interface GuandanPattern {
  type: GuandanHandType;
  /** 主牌点数（用于比较大小） */
  mainRank: number;
  /** 包含的牌 */
  cards: PokerCard[];
  /** 炸弹张数（4-10） */
  bombSize?: number;
}

/** 玩家状态 */
export interface GuandanPlayerState {
  index: PlayerIndex;
  hand: PokerCard[];
  isAI: boolean;
  /** 本局已出牌次数 */
  playedCount: number;
}

/** 游戏状态 */
export interface GuandanState {
  phase: GamePhase;
  players: [GuandanPlayerState, GuandanPlayerState, GuandanPlayerState, GuandanPlayerState];
  /** 当前回合玩家 */
  currentPlayer: PlayerIndex;
  /** 当前级牌（从2开始） */
  currentLevel: RankDisplay;
  /** 当前出牌（最近一轮有效的出牌） */
  currentPlay: GuandanPattern | null;
  /** 当前出牌是谁出的 */
  currentPlayPlayer: PlayerIndex | null;
  /** 连续 pass 的次数（达到3次则清空当前出牌） */
  consecutivePasses: number;
  /** 赢家 */
  winner: PlayerIndex | null;
  /** 获胜方（0=下方+上方，1=左方+右方） */
  winningTeam: 0 | 1 | null;
  /** 出牌历史记录 */
  playHistory: { player: PlayerIndex; cards: PokerCard[] | null }[];
  /** 进贡状态 */
  tributeStatus: {
    done: boolean;
    tributes: { from: PlayerIndex; to: PlayerIndex; card: PokerCard | null }[];
  };
}

/** 出牌动作 */
export type GuandanPlayAction =
  | { type: "play"; cards: PokerCard[] }
  | { type: "pass" };

/** 级牌显示 */
export type RankDisplay = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

// ===================== 常量 =====================

const RANK_DISPLAY_ORDER: RankDisplay[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
];

// ===================== 牌组操作 =====================

let idCounter = 0;
function genId(): string {
  return `gd-${++idCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 创建两副完整的108张牌 */
export function createDoubleDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (let d = 0; d < 2; d++) {
    for (const suit of SUITS) {
      for (const rank of NORMAL_RANKS) {
        deck.push({ suit, rank, id: genId() });
      }
    }
  }
  // 两副牌各有两张王
  deck.push({ suit: "spade", rank: "small-joker", id: genId() });
  deck.push({ suit: "heart", rank: "big-joker", id: genId() });
  deck.push({ suit: "spade", rank: "small-joker", id: genId() });
  deck.push({ suit: "heart", rank: "big-joker", id: genId() });
  return deck;
}

/** 洗牌（Fisher-Yates） */
export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 发牌：每人27张 */
export function dealGuandanCards(deck: PokerCard[]): [PokerCard[], PokerCard[], PokerCard[], PokerCard[]] {
  const shuffled = shuffleDeck(deck);
  const hands: [PokerCard[], PokerCard[], PokerCard[], PokerCard[]] = [[], [], [], []];
  for (let i = 0; i < 108; i++) {
    hands[i % 4].push(shuffled[i]);
  }
  return [
    sortCards(hands[0]),
    sortCards(hands[1]),
    sortCards(hands[2]),
    sortCards(hands[3]),
  ];
}

// ===================== 级牌相关 =====================

/** 获取级牌在当前局中的实际大小值（级牌当最大） */
export function getGuandanCardValue(card: PokerCard, level: RankDisplay): number {
  const base = getCardValue(card);
  // 小王=16, 大王=17
  if (card.rank === "small-joker") return 16;
  if (card.rank === "big-joker") return 17;
  // 级牌提升为18（比大王还大）
  if (card.rank === level) return 18;
  return base;
}

/** 比较两张牌在掼蛋中的大小 */
export function compareGuandanCards(a: PokerCard, b: PokerCard, level: RankDisplay): number {
  return getGuandanCardValue(a, level) - getGuandanCardValue(b, level);
}

/** 掼蛋理牌 */
export function sortGuandanCards(cards: PokerCard[], level: RankDisplay): PokerCard[] {
  return [...cards].sort((a, b) => compareGuandanCards(a, b, level));
}

// ===================== 牌型判断 =====================

/** 统计各点数的数量（考虑级牌） */
function countRanks(cards: PokerCard[], level: RankDisplay): Map<number, number> {
  const map = new Map<number, number>();
  for (const card of cards) {
    const v = getGuandanCardValue(card, level);
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

/** 判断是否为单张 */
function isSingle(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length !== 1) return null;
  return { type: "single", mainRank: getGuandanCardValue(cards[0], level), cards };
}

/** 判断是否为对子 */
function isPair(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length !== 2) return null;
  if (getGuandanCardValue(cards[0], level) !== getGuandanCardValue(cards[1], level)) return null;
  return { type: "pair", mainRank: getGuandanCardValue(cards[0], level), cards };
}

/** 判断是否为三张 */
function isTriple(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length !== 3) return null;
  const v0 = getGuandanCardValue(cards[0], level);
  if (cards.every((c) => getGuandanCardValue(c, level) === v0)) {
    return { type: "triple", mainRank: v0, cards };
  }
  return null;
}

/** 判断是否为三带二 */
function isTripleWithPair(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length !== 5) return null;
  const counts = countRanks(cards, level);
  let tripleRank = -1;
  let pairRank = -1;
  for (const [rank, count] of counts) {
    if (count === 3) tripleRank = rank;
    else if (count === 2) pairRank = rank;
  }
  if (tripleRank !== -1 && pairRank !== -1) {
    return { type: "triple-with-pair", mainRank: tripleRank, cards };
  }
  return null;
}

/** 判断是否为顺子（至少5张连续） */
function isStraight(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length < 5) return null;
  const values = cards.map((c) => getGuandanCardValue(c, level)).sort((a, b) => a - b);
  // 顺子不能包含2、小王、大王、级牌（简化规则）
  if (values.some((v) => v >= 15)) return null;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return null;
  }
  return { type: "straight", mainRank: values[values.length - 1], cards };
}

/** 判断是否为同花顺（简化：同花色顺子） */
function isFlush(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length < 5) return null;
  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return null;
  const straight = isStraight(cards, level);
  if (straight) {
    return { type: "flush", mainRank: straight.mainRank, cards };
  }
  return null;
}

/** 判断是否为炸弹（4-10张同点数） */
function isBomb(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length < 4 || cards.length > 10) return null;
  const v0 = getGuandanCardValue(cards[0], level);
  if (cards.every((c) => getGuandanCardValue(c, level) === v0)) {
    return { type: "bomb", mainRank: v0, cards, bombSize: cards.length };
  }
  return null;
}

/** 判断是否为火箭（四王） */
function isRocket(cards: PokerCard[]): GuandanPattern | null {
  if (cards.length !== 4) return null;
  const jokers = cards.filter((c) => c.rank === "small-joker" || c.rank === "big-joker");
  if (jokers.length === 4) {
    return { type: "rocket", mainRank: 100, cards };
  }
  return null;
}

/** 判断牌型（对外接口） */
export function detectGuandanPattern(cards: PokerCard[], level: RankDisplay): GuandanPattern | null {
  if (cards.length === 0) return null;
  const checks: ((c: PokerCard[]) => GuandanPattern | null)[] = [
    (c) => isRocket(c),
    (c) => isBomb(c, level),
    (c) => isFlush(c, level),
    (c) => isStraight(c, level),
    (c) => isTripleWithPair(c, level),
    (c) => isTriple(c, level),
    (c) => isPair(c, level),
    (c) => isSingle(c, level),
  ];
  for (const check of checks) {
    const result = check(cards);
    if (result) return result;
  }
  return null;
}

// ===================== 牌型大小比较 =====================

/** 牌型权重 */
const TYPE_WEIGHT: Record<GuandanHandType, number> = {
  none: 0,
  single: 1,
  pair: 2,
  triple: 3,
  "triple-with-pair": 4,
  straight: 5,
  flush: 6,
  bomb: 7,
  rocket: 8,
};

/** 比较两个牌型大小
 * @returns true 表示 a 能管住 b（a 更大）
 */
export function canGuandanBeat(a: GuandanPattern, b: GuandanPattern): boolean {
  // 火箭最大
  if (a.type === "rocket") return true;
  if (b.type === "rocket") return false;
  // 炸弹可以管任何非炸弹
  if (a.type === "bomb" && b.type !== "bomb") return true;
  if (b.type === "bomb" && a.type !== "bomb") return false;
  // 同类型比较主牌点数
  if (a.type !== b.type) return false;
  if (a.cards.length !== b.cards.length) return false;
  return a.mainRank > b.mainRank;
}

/** 检查 selected 是否能管住 lastPlayed */
export function canPlayGuandanBeat(
  selected: PokerCard[],
  lastPlayed: GuandanPattern | null,
  level: RankDisplay
): boolean {
  const pattern = detectGuandanPattern(selected, level);
  if (!pattern) return false;
  if (!lastPlayed) return true; // 首家出牌
  return canGuandanBeat(pattern, lastPlayed);
}

// ===================== AI 辅助函数 =====================

/** 从手牌中找出所有能管住指定牌型的出牌方案 */
export function findAllBeatingHands(
  hand: PokerCard[],
  target: GuandanPattern | null,
  level: RankDisplay
): PokerCard[][] {
  if (!target) {
    // 首家出牌：可以出任意合法牌型
    const allPatterns: PokerCard[][] = [];
    // 单张
    for (const card of hand) allPatterns.push([card]);
    // 对子
    const counts = countRanks(hand, level);
    for (const [rank, count] of counts) {
      if (count >= 2) {
        const cards = hand.filter((c) => getGuandanCardValue(c, level) === rank).slice(0, 2);
        allPatterns.push(cards);
      }
    }
    // 三张
    for (const [rank, count] of counts) {
      if (count >= 3) {
        const cards = hand.filter((c) => getGuandanCardValue(c, level) === rank).slice(0, 3);
        allPatterns.push(cards);
      }
    }
    // 炸弹
    for (const [rank, count] of counts) {
      if (count >= 4) {
        const cards = hand.filter((c) => getGuandanCardValue(c, level) === rank);
        allPatterns.push(cards);
      }
    }
    // 火箭
    const jokers = hand.filter((c) => c.rank === "small-joker" || c.rank === "big-joker");
    if (jokers.length === 4) {
      allPatterns.push(jokers);
    }
    return allPatterns;
  }

  const results: PokerCard[][] = [];
  const n = hand.length;

  // 生成所有子集（用位运算，最多 27 张牌，限制子集大小不超过10）
  const maxSubset = 1 << Math.min(n, 10);
  for (let mask = 1; mask < maxSubset; mask++) {
    const subset: PokerCard[] = [];
    for (let i = 0; i < Math.min(n, 10); i++) {
      if (mask & (1 << i)) subset.push(hand[i]);
    }
    const pattern = detectGuandanPattern(subset, level);
    if (pattern && canGuandanBeat(pattern, target)) {
      results.push(subset);
    }
  }

  return results;
}

/** AI 推荐出牌（简单策略：优先出小牌） */
export function suggestGuandanPlay(
  hand: PokerCard[],
  lastPlayed: GuandanPattern | null,
  level: RankDisplay
): PokerCard[] | null {
  const all = findAllBeatingHands(hand, lastPlayed, level);
  if (all.length === 0) return null;
  // 优先出点数小的，牌数少的
  all.sort((a, b) => {
    const maxA = Math.max(...a.map((c) => getGuandanCardValue(c, level)));
    const maxB = Math.max(...b.map((c) => getGuandanCardValue(c, level)));
    if (maxA !== maxB) return maxA - maxB;
    return a.length - b.length;
  });
  return all[0];
}

// ===================== 游戏状态管理 =====================

/** 获取下一个级牌 */
export function getNextLevel(current: RankDisplay): RankDisplay | null {
  const idx = RANK_DISPLAY_ORDER.indexOf(current);
  if (idx >= RANK_DISPLAY_ORDER.length - 1) return null; // 已经到A
  return RANK_DISPLAY_ORDER[idx + 1];
}

/** 创建初始游戏状态 */
export function createGuandanInitialState(): GuandanState {
  const deck = createDoubleDeck();
  const hands = dealGuandanCards(deck);
  const players: [GuandanPlayerState, GuandanPlayerState, GuandanPlayerState, GuandanPlayerState] = [
    { index: 0, hand: hands[0], isAI: false, playedCount: 0 },
    { index: 1, hand: hands[1], isAI: true, playedCount: 0 },
    { index: 2, hand: hands[2], isAI: true, playedCount: 0 },
    { index: 3, hand: hands[3], isAI: true, playedCount: 0 },
  ];

  // 随机决定谁先出牌（简化：从玩家开始）
  const firstPlayer = 0 as PlayerIndex;

  return {
    phase: "playing",
    players,
    currentPlayer: firstPlayer,
    currentLevel: "2",
    currentPlay: null,
    currentPlayPlayer: null,
    consecutivePasses: 0,
    winner: null,
    winningTeam: null,
    playHistory: [],
    tributeStatus: { done: true, tributes: [] },
  };
}

/** 从手牌中移除指定牌 */
function removeCardsFromHand(
  hand: PokerCard[],
  cardsToRemove: PokerCard[]
): PokerCard[] {
  const removeIds = new Set(cardsToRemove.map((c) => c.id));
  return hand.filter((c) => !removeIds.has(c.id));
}

/** 检查玩家是否出完牌 */
function checkWin(state: GuandanState): GuandanState {
  for (let i = 0; i < 4; i++) {
    if (state.players[i as PlayerIndex].hand.length === 0) {
      const winner = i as PlayerIndex;
      // 判断获胜方：0和2一队，1和3一队
      const winningTeam = (winner === 0 || winner === 2) ? 0 : 1;
      return {
        ...state,
        phase: "finished",
        winner,
        winningTeam,
      };
    }
  }
  return state;
}

/** 执行出牌 */
export function doGuandanPlay(
  state: GuandanState,
  action: GuandanPlayAction
): GuandanState {
  if (state.phase !== "playing") return state;

  const playerIdx = state.currentPlayer;
  const player = state.players[playerIdx];

  if (action.type === "pass") {
    // 首家不能 pass
    if (
      state.currentPlay === null ||
      state.currentPlayPlayer === playerIdx
    ) {
      return state;
    }

    const newPasses = state.consecutivePasses + 1;
    const nextPlayer = ((playerIdx + 1) % 4) as PlayerIndex;

    let newState: GuandanState = {
      ...state,
      currentPlayer: nextPlayer,
      consecutivePasses: newPasses,
      playHistory: [
        ...state.playHistory,
        { player: playerIdx, cards: null },
      ],
    };

    // 三人连续 pass，新一轮开始
    if (newPasses >= 3) {
      newState = {
        ...newState,
        currentPlay: null,
        currentPlayPlayer: null,
        consecutivePasses: 0,
      };
    }

    return newState;
  }

  // 出牌
  const selected = action.cards;
  if (!canPlayGuandanBeat(selected, state.currentPlay, state.currentLevel)) {
    return state; // 不合法的出牌
  }

  const pattern = detectGuandanPattern(selected, state.currentLevel);
  if (!pattern) return state;

  const newHand = removeCardsFromHand(player.hand, selected);
  const newPlayers: [GuandanPlayerState, GuandanPlayerState, GuandanPlayerState, GuandanPlayerState] = [
    { ...state.players[0] },
    { ...state.players[1] },
    { ...state.players[2] },
    { ...state.players[3] },
  ];
  newPlayers[playerIdx] = {
    ...player,
    hand: newHand,
    playedCount: player.playedCount + 1,
  };

  const nextPlayer = ((playerIdx + 1) % 4) as PlayerIndex;

  let newState: GuandanState = {
    ...state,
    players: newPlayers,
    currentPlayer: nextPlayer,
    currentPlay: pattern,
    currentPlayPlayer: playerIdx,
    consecutivePasses: 0,
    playHistory: [
      ...state.playHistory,
      { player: playerIdx, cards: selected },
    ],
  };

  // 检查是否有人出完
  newState = checkWin(newState);
  return newState;
}

/** AI 决策出牌 */
export function aiGuandanPlayDecision(state: GuandanState): GuandanPlayAction {
  const player = state.players[state.currentPlayer];
  const suggestion = suggestGuandanPlay(player.hand, state.currentPlay, state.currentLevel);

  if (!suggestion) {
    // 不能管则 pass
    return { type: "pass" };
  }

  // 简单策略：如果手牌很少（<=3），直接出完；否则按推荐出
  if (player.hand.length <= 3) {
    return { type: "play", cards: suggestion };
  }

  return { type: "play", cards: suggestion };
}

/** 获取玩家显示名称 */
export function getGuandanPlayerName(index: PlayerIndex, isAI: boolean): string {
  const names = ["玩家", "右方", "对家", "左方"];
  return isAI ? `${names[index]}(AI)` : names[index];
}

/** 获取队友索引 */
export function getTeammate(index: PlayerIndex): PlayerIndex {
  return ((index + 2) % 4) as PlayerIndex;
}

/** 牌型中文名称 */
export function guandanHandTypeName(type: GuandanHandType): string {
  const names: Record<string, string> = {
    single: "单张",
    pair: "对子",
    triple: "三张",
    "triple-with-pair": "三带二",
    straight: "顺子",
    flush: "同花顺",
    bomb: "炸弹",
    rocket: "火箭",
  };
  return names[type] || type;
}
