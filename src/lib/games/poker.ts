// ===================== 扑克牌系统 =====================

/** 花色 */
export type Suit = "spade" | "heart" | "club" | "diamond";

/** 点数 */
export type Rank =
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "2"
  | "small-joker"
  | "big-joker";

/** 单张扑克牌 */
export interface PokerCard {
  suit: Suit;
  rank: Rank;
  id: string; // 唯一标识，用于 React key
}

/** 牌型分类 */
export type HandType =
  | "none"
  | "single"
  | "pair"
  | "triple"
  | "triple-with-single"
  | "triple-with-pair"
  | "straight"
  | "straight-pair"
  | "airplane"
  | "airplane-with-wings"
  | "bomb"
  | "rocket"
  | "quad-with-two"
  | "quad-with-two-pairs";

/** 牌型结果 */
export interface HandPattern {
  type: HandType;
  /** 主牌点数（用于比较大小） */
  mainRank: number;
  /** 包含的牌 */
  cards: PokerCard[];
}

// ===================== 常量 =====================

export const SUITS: Suit[] = ["spade", "heart", "club", "diamond"];

export const NORMAL_RANKS: Rank[] = [
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "2",
];

export const RANK_VALUES: Record<Rank, number> = {
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  "2": 15,
  "small-joker": 16,
  "big-joker": 17,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: "♠",
  heart: "♥",
  club: "♣",
  diamond: "♦",
};

export const RANK_DISPLAY: Record<Rank, string> = {
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
  "2": "2",
  "small-joker": "小王",
  "big-joker": "大王",
};

/** 红色花色 */
export function isRedSuit(suit: Suit): boolean {
  return suit === "heart" || suit === "diamond";
}

/** 获取牌点数数值 */
export function getCardValue(card: PokerCard): number {
  return RANK_VALUES[card.rank];
}

/** 比较两张牌大小（用于排序） */
export function compareCards(a: PokerCard, b: PokerCard): number {
  return getCardValue(a) - getCardValue(b);
}

/** 自动理牌（按点数升序） */
export function sortCards(cards: PokerCard[]): PokerCard[] {
  return [...cards].sort(compareCards);
}

// ===================== 牌组操作 =====================

let idCounter = 0;
function genId(): string {
  return `card-${++idCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 创建一副完整的54张牌 */
export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of NORMAL_RANKS) {
      deck.push({ suit, rank, id: genId() });
    }
  }
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

/** 发牌：每人17张，留3张底牌 */
export function dealCards(deck: PokerCard[]): {
  hands: [PokerCard[], PokerCard[], PokerCard[]];
  bottom: PokerCard[];
} {
  const shuffled = shuffleDeck(deck);
  const hands: [PokerCard[], PokerCard[], PokerCard[]] = [[], [], []];
  for (let i = 0; i < 51; i++) {
    hands[i % 3].push(shuffled[i]);
  }
  const bottom = shuffled.slice(51, 54);
  return {
    hands: [sortCards(hands[0]), sortCards(hands[1]), sortCards(hands[2])],
    bottom,
  };
}

// ===================== 牌型判断 =====================

/** 统计各点数的数量 */
function countRanks(cards: PokerCard[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const card of cards) {
    const v = getCardValue(card);
    map.set(v, (map.get(v) || 0) + 1);
  }
  return map;
}

/** 判断是否为单张 */
function isSingle(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 1) return null;
  return { type: "single", mainRank: getCardValue(cards[0]), cards };
}

/** 判断是否为对子 */
function isPair(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 2) return null;
  if (getCardValue(cards[0]) !== getCardValue(cards[1])) return null;
  return { type: "pair", mainRank: getCardValue(cards[0]), cards };
}

/** 判断是否为三张 */
function isTriple(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 3) return null;
  const v0 = getCardValue(cards[0]);
  if (cards.every((c) => getCardValue(c) === v0)) {
    return { type: "triple", mainRank: v0, cards };
  }
  return null;
}

/** 判断是否为三带一 */
function isTripleWithSingle(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 4) return null;
  const counts = countRanks(cards);
  let tripleRank = -1;
  let singleRank = -1;
  for (const [rank, count] of counts) {
    if (count === 3) tripleRank = rank;
    else if (count === 1) singleRank = rank;
  }
  if (tripleRank !== -1 && singleRank !== -1) {
    return { type: "triple-with-single", mainRank: tripleRank, cards };
  }
  return null;
}

/** 判断是否为三带二 */
function isTripleWithPair(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 5) return null;
  const counts = countRanks(cards);
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

/** 判断是否为顺子（至少5张，连续） */
function isStraight(cards: PokerCard[]): HandPattern | null {
  if (cards.length < 5) return null;
  const values = cards.map(getCardValue).sort((a, b) => a - b);
  // 顺子不能包含2、小王、大王
  if (values.some((v) => v >= 15)) return null;
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return null;
  }
  return { type: "straight", mainRank: values[values.length - 1], cards };
}

/** 判断是否为连对（至少3连对） */
function isStraightPair(cards: PokerCard[]): HandPattern | null {
  if (cards.length < 6 || cards.length % 2 !== 0) return null;
  const counts = countRanks(cards);
  const pairs: number[] = [];
  for (const [rank, count] of counts) {
    if (count !== 2) return null;
    if (rank >= 15) return null; // 不能包含2、王
    pairs.push(rank);
  }
  pairs.sort((a, b) => a - b);
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i] !== pairs[i - 1] + 1) return null;
  }
  return { type: "straight-pair", mainRank: pairs[pairs.length - 1], cards };
}

/** 判断是否为飞机（至少2个连续三张） */
function isAirplane(cards: PokerCard[]): HandPattern | null {
  if (cards.length < 6 || cards.length % 3 !== 0) return null;
  const counts = countRanks(cards);
  const triples: number[] = [];
  for (const [rank, count] of counts) {
    if (count !== 3) return null;
    if (rank >= 15) return null;
    triples.push(rank);
  }
  triples.sort((a, b) => a - b);
  for (let i = 1; i < triples.length; i++) {
    if (triples[i] !== triples[i - 1] + 1) return null;
  }
  return { type: "airplane", mainRank: triples[triples.length - 1], cards };
}

/** 判断是否为飞机带翅膀 */
function isAirplaneWithWings(cards: PokerCard[]): HandPattern | null {
  if (cards.length < 8) return null;
  const counts = countRanks(cards);
  const triples: number[] = [];
  const others: { rank: number; count: number }[] = [];
  for (const [rank, count] of counts) {
    if (count === 3 && rank < 15) {
      triples.push(rank);
    } else {
      others.push({ rank, count });
    }
  }
  if (triples.length < 2) return null;
  triples.sort((a, b) => a - b);
  for (let i = 1; i < triples.length; i++) {
    if (triples[i] !== triples[i - 1] + 1) return null;
  }
  // 翅膀数量必须等于飞机数量
  const wingCount = others.reduce((sum, o) => sum + o.count, 0);
  if (wingCount !== triples.length && wingCount !== triples.length * 2) {
    return null;
  }
  // 检查翅膀是否都是对子或都是单张
  if (wingCount === triples.length) {
    // 单张翅膀
    if (others.some((o) => o.count !== 1)) return null;
  } else {
    // 对子翅膀
    if (others.some((o) => o.count !== 2)) return null;
  }
  return {
    type: "airplane-with-wings",
    mainRank: triples[triples.length - 1],
    cards,
  };
}

/** 判断是否为炸弹（四张同点数） */
function isBomb(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 4) return null;
  const v0 = getCardValue(cards[0]);
  if (cards.every((c) => getCardValue(c) === v0)) {
    return { type: "bomb", mainRank: v0, cards };
  }
  return null;
}

/** 判断是否为火箭（王炸） */
function isRocket(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 2) return null;
  const values = cards.map(getCardValue).sort((a, b) => a - b);
  if (values[0] === 16 && values[1] === 17) {
    return { type: "rocket", mainRank: 17, cards };
  }
  return null;
}

/** 判断是否为四带二 */
function isQuadWithTwo(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 6) return null;
  const counts = countRanks(cards);
  let quadRank = -1;
  let singleCount = 0;
  for (const [rank, count] of counts) {
    if (count === 4) quadRank = rank;
    else if (count === 1) singleCount += 1;
    else return null;
  }
  if (quadRank !== -1 && singleCount === 2) {
    return { type: "quad-with-two", mainRank: quadRank, cards };
  }
  return null;
}

/** 判断是否为四带两对 */
function isQuadWithTwoPairs(cards: PokerCard[]): HandPattern | null {
  if (cards.length !== 8) return null;
  const counts = countRanks(cards);
  let quadRank = -1;
  let pairCount = 0;
  for (const [rank, count] of counts) {
    if (count === 4) quadRank = rank;
    else if (count === 2) pairCount += 1;
    else return null;
  }
  if (quadRank !== -1 && pairCount === 2) {
    return { type: "quad-with-two-pairs", mainRank: quadRank, cards };
  }
  return null;
}

/** 判断牌型（对外接口） */
export function detectHandPattern(cards: PokerCard[]): HandPattern | null {
  if (cards.length === 0) return null;
  // 按优先级判断
  const checks: ((c: PokerCard[]) => HandPattern | null)[] = [
    isRocket,
    isBomb,
    isSingle,
    isPair,
    isTriple,
    isTripleWithSingle,
    isTripleWithPair,
    isStraight,
    isStraightPair,
    isAirplane,
    isAirplaneWithWings,
    isQuadWithTwo,
    isQuadWithTwoPairs,
  ];
  for (const check of checks) {
    const result = check(cards);
    if (result) return result;
  }
  return null;
}

// ===================== 牌型大小比较 =====================

/** 牌型权重（用于比较不同牌型） */
const TYPE_WEIGHT: Record<HandType, number> = {
  none: 0,
  single: 1,
  pair: 2,
  triple: 3,
  "triple-with-single": 4,
  "triple-with-pair": 5,
  straight: 6,
  "straight-pair": 7,
  airplane: 8,
  "airplane-with-wings": 9,
  "quad-with-two": 10,
  "quad-with-two-pairs": 11,
  bomb: 12,
  rocket: 13,
};

/** 比较两个牌型大小
 * @returns true 表示 a 能管住 b（a 更大）
 */
export function canBeat(a: HandPattern, b: HandPattern): boolean {
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
export function canPlayBeat(
  selected: PokerCard[],
  lastPlayed: HandPattern | null
): boolean {
  const pattern = detectHandPattern(selected);
  if (!pattern) return false;
  if (!lastPlayed) return true; // 首家出牌
  return canBeat(pattern, lastPlayed);
}

// ===================== AI 辅助函数 =====================

/** 从手牌中找出所有能管住指定牌型的出牌方案 */
export function findAllBeatingHands(
  hand: PokerCard[],
  target: HandPattern | null
): PokerCard[][] {
  if (!target) {
    // 首家出牌：可以出任意合法牌型（优先推荐单张、对子等）
    const allPatterns: PokerCard[][] = [];
    // 单张
    for (const card of hand) allPatterns.push([card]);
    // 对子
    const counts = countRanks(hand);
    for (const [rank, count] of counts) {
      if (count >= 2) {
        const cards = hand.filter((c) => getCardValue(c) === rank).slice(0, 2);
        allPatterns.push(cards);
      }
    }
    // 三张
    for (const [rank, count] of counts) {
      if (count >= 3) {
        const cards = hand.filter((c) => getCardValue(c) === rank).slice(0, 3);
        allPatterns.push(cards);
      }
    }
    // 炸弹
    for (const [rank, count] of counts) {
      if (count === 4) {
        const cards = hand.filter((c) => getCardValue(c) === rank);
        allPatterns.push(cards);
      }
    }
    // 火箭
    const smallJoker = hand.find((c) => c.rank === "small-joker");
    const bigJoker = hand.find((c) => c.rank === "big-joker");
    if (smallJoker && bigJoker) {
      allPatterns.push([smallJoker, bigJoker]);
    }
    return allPatterns;
  }

  const results: PokerCard[][] = [];
  const n = hand.length;

  // 生成所有子集（用位运算，最多 20 张牌）
  const maxSubset = 1 << n;
  for (let mask = 1; mask < maxSubset; mask++) {
    const subset: PokerCard[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(hand[i]);
    }
    const pattern = detectHandPattern(subset);
    if (pattern && canBeat(pattern, target)) {
      results.push(subset);
    }
  }

  return results;
}

/** AI 推荐出牌（简单策略：优先出小牌） */
export function suggestPlay(
  hand: PokerCard[],
  lastPlayed: HandPattern | null
): PokerCard[] | null {
  const all = findAllBeatingHands(hand, lastPlayed);
  if (all.length === 0) return null;
  // 优先出点数小的，牌数少的
  all.sort((a, b) => {
    const maxA = Math.max(...a.map(getCardValue));
    const maxB = Math.max(...b.map(getCardValue));
    if (maxA !== maxB) return maxA - maxB;
    return a.length - b.length;
  });
  return all[0];
}

/** 判断是否为春天（地主出完，农民一张未出） */
export function isSpring(
  landlordPlayedCount: number,
  peasant1PlayedCount: number,
  peasant2PlayedCount: number,
  landlordWon: boolean
): boolean {
  if (!landlordWon) return false;
  return peasant1PlayedCount === 0 && peasant2PlayedCount === 0;
}

/** 判断是否为反春（农民出完，地主只出一次） */
export function isAntiSpring(
  landlordPlayedCount: number,
  peasant1PlayedCount: number,
  peasant2PlayedCount: number,
  landlordWon: boolean
): boolean {
  if (landlordWon) return false;
  return landlordPlayedCount <= 1;
}

/** 计算得分 */
export function calculateScore(
  baseScore: number,
  landlordWon: boolean,
  spring: boolean,
  antiSpring: boolean,
  bombCount: number,
  rocketCount: number
): { landlord: number; peasant1: number; peasant2: number } {
  let multiplier = 1;
  if (spring || antiSpring) multiplier *= 2;
  multiplier *= Math.pow(2, bombCount + rocketCount);
  const score = baseScore * multiplier;
  if (landlordWon) {
    return { landlord: score * 2, peasant1: -score, peasant2: -score };
  }
  return { landlord: -score * 2, peasant1: score, peasant2: score };
}
