// ===================== 拖拉机（升级）游戏逻辑 =====================

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
export type TractorPlayerIndex = 0 | 1 | 2 | 3;

/** 游戏阶段 */
export type TractorPhase =
  | "bidding"      // 亮主阶段
  | "playing"      // 出牌阶段
  | "finished";    // 游戏结束

/** 主牌花色 */
export type TrumpSuit = Suit | "none"; // none=无主

/** 牌型分类（拖拉机专用） */
export type TractorHandType =
  | "none"
  | "single"
  | "pair"
  | "tractor"      // 连对
  | "throw"        // 甩牌（简化）
  | "bomb";        // 简化：无主时可用的炸弹

/** 牌型结果 */
export interface TractorPattern {
  type: TractorHandType;
  /** 主牌点数（用于比较大小） */
  mainRank: number;
  /** 包含的牌 */
  cards: PokerCard[];
  /** 是否主牌 */
  isTrump: boolean;
}

/** 玩家状态 */
export interface TractorPlayerState {
  index: TractorPlayerIndex;
  hand: PokerCard[];
  isAI: boolean;
  /** 本局已出牌次数 */
  playedCount: number;
  /** 得分 */
  score: number;
}

/** 游戏状态 */
export interface TractorState {
  phase: TractorPhase;
  players: [TractorPlayerState, TractorPlayerState, TractorPlayerState, TractorPlayerState];
  /** 当前回合玩家 */
  currentPlayer: TractorPlayerIndex;
  /** 当前主牌花色 */
  trumpSuit: TrumpSuit;
  /** 当前级牌 */
  currentLevel: RankDisplay;
  /** 庄家（先出牌的一方） */
  dealer: TractorPlayerIndex;
  /** 当前出牌（最近一轮有效的出牌） */
  currentPlay: TractorPattern | null;
  /** 当前出牌是谁出的 */
  currentPlayPlayer: TractorPlayerIndex | null;
  /** 连续 pass 的次数（达到3次则清空当前出牌） */
  consecutivePasses: number;
  /** 赢家 */
  winner: TractorPlayerIndex | null;
  /** 获胜方（0=下方+上方，1=左方+右方） */
  winningTeam: 0 | 1 | null;
  /** 出牌历史记录 */
  playHistory: { player: TractorPlayerIndex; cards: PokerCard[] | null }[];
  /** 底牌 */
  bottomCards: PokerCard[];
  /** 扣底完成 */
  bottomSettled: boolean;
  /** 亮主信息 */
  bidInfo: {
    player: TractorPlayerIndex | null;
    suit: TrumpSuit;
    rank: RankDisplay;
  };
  /** 当前轮出牌（每轮第一家出的牌决定花色） */
  roundLeadSuit: Suit | null;
  /** 当前轮各玩家出的牌 */
  roundPlays: { player: TractorPlayerIndex; cards: PokerCard[] }[];
}

/** 出牌动作 */
export type TractorPlayAction =
  | { type: "play"; cards: PokerCard[] }
  | { type: "pass" };

/** 亮主动作 */
export type TractorBidAction =
  | { type: "bid"; suit: TrumpSuit; cards: PokerCard[] }
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
  return `tr-${++idCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 创建两副完整的108张牌 */
export function createTractorDeck(): PokerCard[] {
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
export function shuffleTractorDeck(deck: PokerCard[]): PokerCard[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 发牌：每人25张，留8张底牌 */
export function dealTractorCards(deck: PokerCard[]): {
  hands: [PokerCard[], PokerCard[], PokerCard[], PokerCard[]];
  bottom: PokerCard[];
} {
  const shuffled = shuffleTractorDeck(deck);
  const hands: [PokerCard[], PokerCard[], PokerCard[], PokerCard[]] = [[], [], [], []];
  for (let i = 0; i < 100; i++) {
    hands[i % 4].push(shuffled[i]);
  }
  const bottom = shuffled.slice(100, 108);
  return {
    hands: [
      sortCards(hands[0]),
      sortCards(hands[1]),
      sortCards(hands[2]),
      sortCards(hands[3]),
    ],
    bottom,
  };
}

// ===================== 主牌系统 =====================

/** 判断是否为常主（大小王和当前级牌） */
export function isFixedTrump(card: PokerCard, level: RankDisplay): boolean {
  return card.rank === "small-joker" || card.rank === "big-joker" || card.rank === level;
}

/** 判断某张牌是否为主牌 */
export function isTrumpCard(card: PokerCard, trumpSuit: TrumpSuit, level: RankDisplay): boolean {
  if (isFixedTrump(card, level)) return true;
  if (trumpSuit !== "none" && card.suit === trumpSuit) return true;
  return false;
}

/** 获取牌在拖拉机中的大小值 */
export function getTractorCardValue(card: PokerCard, trumpSuit: TrumpSuit, level: RankDisplay): number {
  // 大王=100, 小王=99
  if (card.rank === "big-joker") return 100;
  if (card.rank === "small-joker") return 99;
  // 级牌主花色=98, 级牌副花色=97
  if (card.rank === level) {
    return (trumpSuit !== "none" && card.suit === trumpSuit) ? 98 : 97;
  }
  // 主花色其他牌：按点数+50
  if (trumpSuit !== "none" && card.suit === trumpSuit) {
    return getCardValue(card) + 50;
  }
  // 副牌：按点数，花色区分
  const suitOrder: Record<Suit, number> = { spade: 0, heart: 1, club: 2, diamond: 3 };
  return getCardValue(card) + suitOrder[card.suit] * 20;
}

/** 比较两张牌在拖拉机中的大小 */
export function compareTractorCards(a: PokerCard, b: PokerCard, trumpSuit: TrumpSuit, level: RankDisplay): number {
  return getTractorCardValue(a, trumpSuit, level) - getTractorCardValue(b, trumpSuit, level);
}

/** 拖拉机理牌 */
export function sortTractorCards(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): PokerCard[] {
  return [...cards].sort((a, b) => compareTractorCards(a, b, trumpSuit, level));
}

// ===================== 牌型判断 =====================

/** 统计各点数的数量（考虑主牌系统） */
function countTractorRanks(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): Map<number, number> {
  const map = new Map<number, number>();
  for (const card of cards) {
    const v = getTractorCardValue(card, trumpSuit, level);
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

/** 判断是否为单张 */
function isSingle(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): TractorPattern | null {
  if (cards.length !== 1) return null;
  const card = cards[0];
  return {
    type: "single",
    mainRank: getTractorCardValue(card, trumpSuit, level),
    cards,
    isTrump: isTrumpCard(card, trumpSuit, level),
  };
}

/** 判断是否为对子 */
function isPair(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): TractorPattern | null {
  if (cards.length !== 2) return null;
  if (getTractorCardValue(cards[0], trumpSuit, level) !== getTractorCardValue(cards[1], trumpSuit, level)) return null;
  return {
    type: "pair",
    mainRank: getTractorCardValue(cards[0], trumpSuit, level),
    cards,
    isTrump: isTrumpCard(cards[0], trumpSuit, level),
  };
}

/** 判断是否为拖拉机（连对，至少两连对） */
function isTractor(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): TractorPattern | null {
  if (cards.length < 4 || cards.length % 2 !== 0) return null;
  const counts = countTractorRanks(cards, trumpSuit, level);
  const pairs: number[] = [];
  for (const [rank, count] of counts) {
    if (count !== 2) return null;
    pairs.push(rank);
  }
  pairs.sort((a, b) => a - b);
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i] !== pairs[i - 1] + 1) return null;
  }
  return {
    type: "tractor",
    mainRank: pairs[pairs.length - 1],
    cards,
    isTrump: cards.every((c) => isTrumpCard(c, trumpSuit, level)),
  };
}

/** 判断是否为甩牌（简化：同花色的连续单张或对子组合） */
function isThrow(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): TractorPattern | null {
  // 简化版甩牌判断：所有牌同花色（或同为主牌），且可以形成连续
  if (cards.length < 2) return null;
  const first = cards[0];
  const allSameSuit = cards.every((c) => {
    if (isTrumpCard(first, trumpSuit, level) && isTrumpCard(c, trumpSuit, level)) return true;
    return c.suit === first.suit && !isTrumpCard(c, trumpSuit, level) && !isTrumpCard(first, trumpSuit, level);
  });
  if (!allSameSuit) return null;
  const values = cards.map((c) => getTractorCardValue(c, trumpSuit, level)).sort((a, b) => a - b);
  // 简化：允许不连续但同花色多张出
  return {
    type: "throw",
    mainRank: values[values.length - 1],
    cards,
    isTrump: isTrumpCard(first, trumpSuit, level),
  };
}

/** 判断牌型（对外接口） */
export function detectTractorPattern(cards: PokerCard[], trumpSuit: TrumpSuit, level: RankDisplay): TractorPattern | null {
  if (cards.length === 0) return null;
  const checks: ((c: PokerCard[]) => TractorPattern | null)[] = [
    (c) => isTractor(c, trumpSuit, level),
    (c) => isPair(c, trumpSuit, level),
    (c) => isSingle(c, trumpSuit, level),
    (c) => isThrow(c, trumpSuit, level),
  ];
  for (const check of checks) {
    const result = check(cards);
    if (result) return result;
  }
  return null;
}

// ===================== 出牌规则验证 =====================

/** 验证出牌是否符合规则（首家决定花色，跟家必须跟同花色） */
export function validateTractorPlay(
  cards: PokerCard[],
  hand: PokerCard[],
  roundLeadSuit: Suit | null,
  trumpSuit: TrumpSuit,
  level: RankDisplay
): { valid: boolean; reason?: string } {
  if (cards.length === 0) return { valid: false, reason: "未选择牌" };

  const pattern = detectTractorPattern(cards, trumpSuit, level);
  if (!pattern) return { valid: false, reason: "不是合法牌型" };

  // 检查牌是否都在手牌中
  const handIds = new Set(hand.map((c) => c.id));
  for (const card of cards) {
    if (!handIds.has(card.id)) return { valid: false, reason: "手牌中没有这张牌" };
  }

  // 首家出牌：合法即可
  if (roundLeadSuit === null) return { valid: true };

  // 跟家出牌：需要检查是否跟了正确的花色
  // 简化规则：如果首家出的是非主牌，跟家必须尽量跟同花色
  // 这里简化处理，只要牌型合法即可（完整规则需要更复杂的跟牌验证）
  return { valid: true };
}

/** 比较两个牌型大小（拖拉机规则：主牌>副牌，同类型比点数） */
export function canTractorBeat(a: TractorPattern, b: TractorPattern, trumpSuit: TrumpSuit, level: RankDisplay): boolean {
  // 主牌可以管副牌
  if (a.isTrump && !b.isTrump) return true;
  if (!a.isTrump && b.isTrump) return false;
  // 同为主牌或同为副牌，比较类型和点数
  if (a.type !== b.type) return false;
  if (a.cards.length !== b.cards.length) return false;
  return a.mainRank > b.mainRank;
}

/** 检查 selected 是否能管住 lastPlayed */
export function canPlayTractorBeat(
  selected: PokerCard[],
  lastPlayed: TractorPattern | null,
  trumpSuit: TrumpSuit,
  level: RankDisplay
): boolean {
  const pattern = detectTractorPattern(selected, trumpSuit, level);
  if (!pattern) return false;
  if (!lastPlayed) return true; // 首家出牌
  return canTractorBeat(pattern, lastPlayed, trumpSuit, level);
}

// ===================== AI 辅助函数 =====================

/** 从手牌中找出所有能管住指定牌型的出牌方案 */
export function findAllTractorBeatingHands(
  hand: PokerCard[],
  target: TractorPattern | null,
  trumpSuit: TrumpSuit,
  level: RankDisplay
): PokerCard[][] {
  if (!target) {
    // 首家出牌：可以出任意合法牌型
    const allPatterns: PokerCard[][] = [];
    // 单张
    for (const card of hand) allPatterns.push([card]);
    // 对子
    const counts = countTractorRanks(hand, trumpSuit, level);
    for (const [rank, count] of counts) {
      if (count >= 2) {
        const cards = hand.filter((c) => getTractorCardValue(c, trumpSuit, level) === rank).slice(0, 2);
        allPatterns.push(cards);
      }
    }
    // 拖拉机（连对）
    // 简化：只找2连对和3连对
    const sortedHand = sortTractorCards(hand, trumpSuit, level);
    for (let len = 2; len <= 3; len++) {
      for (let i = 0; i <= sortedHand.length - len * 2; i++) {
        const subset = sortedHand.slice(i, i + len * 2);
        if (isTractor(subset, trumpSuit, level)) {
          allPatterns.push(subset);
        }
      }
    }
    return allPatterns;
  }

  const results: PokerCard[][] = [];
  const n = hand.length;

  // 生成所有子集（限制子集大小不超过8）
  const maxSubset = 1 << Math.min(n, 8);
  for (let mask = 1; mask < maxSubset; mask++) {
    const subset: PokerCard[] = [];
    for (let i = 0; i < Math.min(n, 8); i++) {
      if (mask & (1 << i)) subset.push(hand[i]);
    }
    const pattern = detectTractorPattern(subset, trumpSuit, level);
    if (pattern && canTractorBeat(pattern, target, trumpSuit, level)) {
      results.push(subset);
    }
  }

  return results;
}

/** AI 推荐出牌（简单策略：优先出小牌） */
export function suggestTractorPlay(
  hand: PokerCard[],
  lastPlayed: TractorPattern | null,
  trumpSuit: TrumpSuit,
  level: RankDisplay
): PokerCard[] | null {
  const all = findAllTractorBeatingHands(hand, lastPlayed, trumpSuit, level);
  if (all.length === 0) return null;
  // 优先出点数小的，牌数少的
  all.sort((a, b) => {
    const maxA = Math.max(...a.map((c) => getTractorCardValue(c, trumpSuit, level)));
    const maxB = Math.max(...b.map((c) => getTractorCardValue(c, trumpSuit, level)));
    if (maxA !== maxB) return maxA - maxB;
    return a.length - b.length;
  });
  return all[0];
}

// ===================== 游戏状态管理 =====================

/** 获取下一个级牌 */
export function getNextTractorLevel(current: RankDisplay): RankDisplay | null {
  const idx = RANK_DISPLAY_ORDER.indexOf(current);
  if (idx >= RANK_DISPLAY_ORDER.length - 1) return null;
  return RANK_DISPLAY_ORDER[idx + 1];
}

/** 创建初始游戏状态 */
export function createTractorInitialState(): TractorState {
  const deck = createTractorDeck();
  const { hands, bottom } = dealTractorCards(deck);
  const players: [TractorPlayerState, TractorPlayerState, TractorPlayerState, TractorPlayerState] = [
    { index: 0, hand: hands[0], isAI: false, playedCount: 0, score: 0 },
    { index: 1, hand: hands[1], isAI: true, playedCount: 0, score: 0 },
    { index: 2, hand: hands[2], isAI: true, playedCount: 0, score: 0 },
    { index: 3, hand: hands[3], isAI: true, playedCount: 0, score: 0 },
  ];

  // 随机决定庄家
  const dealer = Math.floor(Math.random() * 4) as TractorPlayerIndex;

  return {
    phase: "bidding",
    players,
    currentPlayer: dealer,
    trumpSuit: "none",
    currentLevel: "2",
    dealer,
    currentPlay: null,
    currentPlayPlayer: null,
    consecutivePasses: 0,
    winner: null,
    winningTeam: null,
    playHistory: [],
    bottomCards: bottom,
    bottomSettled: false,
    bidInfo: { player: null, suit: "none", rank: "2" },
    roundLeadSuit: null,
    roundPlays: [],
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

/** 执行亮主 */
export function doTractorBid(
  state: TractorState,
  action: TractorBidAction
): TractorState {
  if (state.phase !== "bidding") return state;

  const playerIdx = state.currentPlayer;

  if (action.type === "pass") {
    const nextPlayer = ((playerIdx + 1) % 4) as TractorPlayerIndex;
    // 如果所有人都pass，则庄家亮主（无主）
    if (nextPlayer === state.dealer && state.bidInfo.player === null) {
      return {
        ...state,
        phase: "playing",
        currentPlayer: state.dealer,
        trumpSuit: "none",
        bidInfo: { player: state.dealer, suit: "none", rank: state.currentLevel },
      };
    }
    // 如果回到第一个亮主的人，结束亮主
    if (state.bidInfo.player !== null && nextPlayer === state.bidInfo.player) {
      return {
        ...state,
        phase: "playing",
        currentPlayer: state.dealer,
      };
    }
    return {
      ...state,
      currentPlayer: nextPlayer,
    };
  }

  // 亮主
  const newPlayers = [
    { ...state.players[0] },
    { ...state.players[1] },
    { ...state.players[2] },
    { ...state.players[3] },
  ] as [TractorPlayerState, TractorPlayerState, TractorPlayerState, TractorPlayerState];

  // 从手牌中移除亮主的牌（简化：不实际移除，只是记录）
  // 实际应该将亮主牌放到一边，这里简化处理

  const nextPlayer = ((playerIdx + 1) % 4) as TractorPlayerIndex;

  return {
    ...state,
    players: newPlayers,
    currentPlayer: nextPlayer,
    trumpSuit: action.suit,
    bidInfo: { player: playerIdx, suit: action.suit, rank: state.currentLevel },
  };
}

/** 检查玩家是否出完牌 */
function checkTractorWin(state: TractorState): TractorState {
  for (let i = 0; i < 4; i++) {
    if (state.players[i as TractorPlayerIndex].hand.length === 0) {
      const winner = i as TractorPlayerIndex;
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
export function doTractorPlay(
  state: TractorState,
  action: TractorPlayAction
): TractorState {
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
    const nextPlayer = ((playerIdx + 1) % 4) as TractorPlayerIndex;

    let newState: TractorState = {
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
  const validation = validateTractorPlay(
    selected,
    player.hand,
    state.roundLeadSuit,
    state.trumpSuit,
    state.currentLevel
  );
  if (!validation.valid) return state;

  if (!canPlayTractorBeat(selected, state.currentPlay, state.trumpSuit, state.currentLevel)) {
    return state; // 不合法的出牌
  }

  const pattern = detectTractorPattern(selected, state.trumpSuit, state.currentLevel);
  if (!pattern) return state;

  const newHand = removeCardsFromHand(player.hand, selected);
  const newPlayers: [TractorPlayerState, TractorPlayerState, TractorPlayerState, TractorPlayerState] = [
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

  const nextPlayer = ((playerIdx + 1) % 4) as TractorPlayerIndex;

  // 更新轮次信息
  let newRoundLeadSuit = state.roundLeadSuit;
  let newRoundPlays = [...state.roundPlays, { player: playerIdx, cards: selected }];

  // 如果是首家出牌，设定领出花色
  if (state.roundLeadSuit === null) {
    const firstCard = selected[0];
    if (!isTrumpCard(firstCard, state.trumpSuit, state.currentLevel)) {
      newRoundLeadSuit = firstCard.suit;
    }
  }

  // 如果一轮出完（4家都出了），判断赢家
  let newCurrentPlay = pattern;
  let newCurrentPlayPlayer = playerIdx;
  let newConsecutivePasses = 0;

  if (newRoundPlays.length >= 4) {
    // 简化：当前出牌者赢得这一轮（实际应该比较大小）
    // 重置轮次
    newRoundLeadSuit = null;
    newRoundPlays = [];
  }

  let newState: TractorState = {
    ...state,
    players: newPlayers,
    currentPlayer: nextPlayer,
    currentPlay: newCurrentPlay,
    currentPlayPlayer: newCurrentPlayPlayer,
    consecutivePasses: newConsecutivePasses,
    playHistory: [
      ...state.playHistory,
      { player: playerIdx, cards: selected },
    ],
    roundLeadSuit: newRoundLeadSuit,
    roundPlays: newRoundPlays,
  };

  // 检查是否有人出完
  newState = checkTractorWin(newState);
  return newState;
}

/** AI 决策亮主 */
export function aiTractorBidDecision(state: TractorState): TractorBidAction {
  const player = state.players[state.currentPlayer];
  const level = state.currentLevel;

  // 统计各花色的级牌和王牌数量
  const suitCounts: Record<Suit, number> = { spade: 0, heart: 0, club: 0, diamond: 0 };
  let jokerCount = 0;
  let levelCount = 0;

  for (const card of player.hand) {
    if (card.rank === "small-joker" || card.rank === "big-joker") {
      jokerCount++;
    } else if (card.rank === level) {
      levelCount++;
      suitCounts[card.suit]++;
    } else {
      suitCounts[card.suit]++;
    }
  }

  // 如果有较好的主牌组合，就亮主
  let bestSuit: Suit | null = null;
  let bestCount = 0;
  for (const suit of SUITS) {
    const count = suitCounts[suit] + jokerCount + levelCount;
    if (count > bestCount) {
      bestCount = count;
      bestSuit = suit;
    }
  }

  // 如果主牌数量>=5，亮主
  if (bestCount >= 5 && bestSuit) {
    // 找一张该花色的级牌来亮主
    const bidCard = player.hand.find((c) => c.suit === bestSuit && c.rank === level);
    if (bidCard) {
      return { type: "bid", suit: bestSuit, cards: [bidCard] };
    }
  }

  return { type: "pass" };
}

/** AI 决策出牌 */
export function aiTractorPlayDecision(state: TractorState): TractorPlayAction {
  const player = state.players[state.currentPlayer];
  const suggestion = suggestTractorPlay(
    player.hand,
    state.currentPlay,
    state.trumpSuit,
    state.currentLevel
  );

  if (!suggestion) {
    return { type: "pass" };
  }

  if (player.hand.length <= 3) {
    return { type: "play", cards: suggestion };
  }

  return { type: "play", cards: suggestion };
}

/** 获取玩家显示名称 */
export function getTractorPlayerName(index: TractorPlayerIndex, isAI: boolean): string {
  const names = ["玩家", "右方", "对家", "左方"];
  return isAI ? `${names[index]}(AI)` : names[index];
}

/** 获取队友索引 */
export function getTractorTeammate(index: TractorPlayerIndex): TractorPlayerIndex {
  return ((index + 2) % 4) as TractorPlayerIndex;
}

/** 牌型中文名称 */
export function tractorHandTypeName(type: TractorHandType): string {
  const names: Record<string, string> = {
    single: "单张",
    pair: "对子",
    tractor: "拖拉机",
    throw: "甩牌",
    bomb: "炸弹",
  };
  return names[type] || type;
}

/** 获取主牌花色显示名称 */
export function getTrumpSuitName(suit: TrumpSuit): string {
  if (suit === "none") return "无主";
  const names: Record<Suit, string> = {
    spade: "黑桃",
    heart: "红桃",
    club: "梅花",
    diamond: "方块",
  };
  return names[suit];
}
