// ===================== 斗地主游戏逻辑 =====================

import {
  type PokerCard,
  type HandPattern,
  createDeck,
  dealCards,
  detectHandPattern,
  canPlayBeat,
  suggestPlay,
  sortCards,
  getCardValue,
  isSpring,
  isAntiSpring,
  calculateScore,
} from "./poker";

/** 玩家索引：0=玩家自己（下方），1=右侧AI，2=左侧AI */
export type PlayerIndex = 0 | 1 | 2;

/** 游戏阶段 */
export type GamePhase =
  | "bidding"      // 叫地主阶段
  | "playing"      // 出牌阶段
  | "finished";    // 游戏结束

/** 玩家角色 */
export type PlayerRole = "landlord" | "peasant";

/** 叫地主动作 */
export type BidAction = "call" | "pass";

/** 出牌动作 */
export type PlayAction =
  | { type: "play"; cards: PokerCard[] }
  | { type: "pass" };

/** 玩家状态 */
export interface PlayerState {
  index: PlayerIndex;
  hand: PokerCard[];
  role: PlayerRole | null;
  isAI: boolean;
  /** 本局已出牌次数 */
  playedCount: number;
}

/** 游戏状态 */
export interface DoudizhuState {
  phase: GamePhase;
  players: [PlayerState, PlayerState, PlayerState];
  /** 底牌 */
  bottomCards: PokerCard[];
  /** 当前回合玩家 */
  currentPlayer: PlayerIndex;
  /** 地主索引 */
  landlord: PlayerIndex | null;
  /** 当前出牌（最近一轮有效的出牌） */
  currentPlay: HandPattern | null;
  /** 当前出牌是谁出的 */
  currentPlayPlayer: PlayerIndex | null;
  /** 连续 pass 的次数（达到2次则清空当前出牌） */
  consecutivePasses: number;
  /** 叫地主轮次记录 */
  bidHistory: { player: PlayerIndex; action: BidAction }[];
  /** 本局使用的炸弹数 */
  bombCount: number;
  /** 本局使用的火箭数 */
  rocketCount: number;
  /** 基础分数 */
  baseScore: number;
  /** 赢家 */
  winner: PlayerIndex | null;
  /** 春天/反春 */
  spring: boolean;
  antiSpring: boolean;
  /** 得分 */
  scores: { landlord: number; peasant1: number; peasant2: number } | null;
  /** 出牌历史记录 */
  playHistory: { player: PlayerIndex; cards: PokerCard[] | null }[];
}

/** 创建初始游戏状态 */
export function createInitialState(): DoudizhuState {
  const deck = createDeck();
  const { hands, bottom } = dealCards(deck);
  const players: [PlayerState, PlayerState, PlayerState] = [
    { index: 0, hand: hands[0], role: null, isAI: false, playedCount: 0 },
    { index: 1, hand: hands[1], role: null, isAI: true, playedCount: 0 },
    { index: 2, hand: hands[2], role: null, isAI: true, playedCount: 0 },
  ];

  // 随机决定谁先叫地主
  const firstBidder = Math.floor(Math.random() * 3) as PlayerIndex;

  return {
    phase: "bidding",
    players,
    bottomCards: bottom,
    currentPlayer: firstBidder,
    landlord: null,
    currentPlay: null,
    currentPlayPlayer: null,
    consecutivePasses: 0,
    bidHistory: [],
    bombCount: 0,
    rocketCount: 0,
    baseScore: 1,
    winner: null,
    spring: false,
    antiSpring: false,
    scores: null,
    playHistory: [],
  };
}

/** 判断叫地主是否结束，返回地主索引或 null（继续） */
function resolveBidWinner(
  bidHistory: { player: PlayerIndex; action: BidAction }[]
): PlayerIndex | null {
  // 简单规则：第一个叫地主的人成为地主
  // 也可以扩展为抢地主机制
  const calls = bidHistory.filter((b) => b.action === "call");
  if (calls.length === 0) {
    // 没人叫：重新发牌（这里简单处理：第一个玩家强制当地主）
    if (bidHistory.length >= 3) return 0;
    return null;
  }
  // 如果有人叫了，叫地主结束
  if (bidHistory.length >= 3) {
    return calls[0].player;
  }
  return null;
}

/** 执行叫地主 */
export function doBid(
  state: DoudizhuState,
  action: BidAction
): DoudizhuState {
  if (state.phase !== "bidding") return state;

  const newBidHistory = [
    ...state.bidHistory,
    { player: state.currentPlayer, action },
  ];

  const winner = resolveBidWinner(newBidHistory);
  if (winner !== null) {
    // 叫地主结束，进入出牌阶段
    const newPlayers: [PlayerState, PlayerState, PlayerState] = [
      { ...state.players[0] },
      { ...state.players[1] },
      { ...state.players[2] },
    ];
    // 设置角色
    for (let i = 0; i < 3; i++) {
      newPlayers[i as PlayerIndex].role =
        i === winner ? "landlord" : "peasant";
    }
    // 地主获得底牌
    newPlayers[winner].hand = sortCards([
      ...newPlayers[winner].hand,
      ...state.bottomCards,
    ]);

    return {
      ...state,
      phase: "playing",
      players: newPlayers,
      landlord: winner,
      currentPlayer: winner, // 地主先出牌
      bidHistory: newBidHistory,
      bottomCards: state.bottomCards, // 保留底牌用于展示
    };
  }

  // 继续下一个人叫
  const nextPlayer = ((state.currentPlayer + 1) % 3) as PlayerIndex;
  return {
    ...state,
    currentPlayer: nextPlayer,
    bidHistory: newBidHistory,
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
function checkWin(state: DoudizhuState): DoudizhuState {
  for (let i = 0; i < 3; i++) {
    if (state.players[i as PlayerIndex].hand.length === 0) {
      const winner = i as PlayerIndex;
      const landlord = state.landlord!;
      const landlordWon = winner === landlord;
      const spring = isSpring(
        state.players[landlord].playedCount,
        state.players[(landlord + 1) % 3].playedCount,
        state.players[(landlord + 2) % 3].playedCount,
        landlordWon
      );
      const antiSpring = isAntiSpring(
        state.players[landlord].playedCount,
        state.players[(landlord + 1) % 3].playedCount,
        state.players[(landlord + 2) % 3].playedCount,
        landlordWon
      );
      const scores = calculateScore(
        state.baseScore,
        landlordWon,
        spring,
        antiSpring,
        state.bombCount,
        state.rocketCount
      );
      return {
        ...state,
        phase: "finished",
        winner,
        spring,
        antiSpring,
        scores,
      };
    }
  }
  return state;
}

/** 执行出牌 */
export function doPlay(
  state: DoudizhuState,
  action: PlayAction
): DoudizhuState {
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
    const nextPlayer = ((playerIdx + 1) % 3) as PlayerIndex;

    let newState: DoudizhuState = {
      ...state,
      currentPlayer: nextPlayer,
      consecutivePasses: newPasses,
      playHistory: [
        ...state.playHistory,
        { player: playerIdx, cards: null },
      ],
    };

    // 两人连续 pass，新一轮开始
    if (newPasses >= 2) {
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
  if (!canPlayBeat(selected, state.currentPlay)) {
    return state; // 不合法的出牌
  }

  const pattern = detectHandPattern(selected);
  if (!pattern) return state;

  // 检查炸弹和火箭
  let newBombCount = state.bombCount;
  let newRocketCount = state.rocketCount;
  if (pattern.type === "bomb") newBombCount++;
  if (pattern.type === "rocket") newRocketCount++;

  const newHand = removeCardsFromHand(player.hand, selected);
  const newPlayers: [PlayerState, PlayerState, PlayerState] = [
    { ...state.players[0] },
    { ...state.players[1] },
    { ...state.players[2] },
  ];
  newPlayers[playerIdx] = {
    ...player,
    hand: newHand,
    playedCount: player.playedCount + 1,
  };

  const nextPlayer = ((playerIdx + 1) % 3) as PlayerIndex;

  let newState: DoudizhuState = {
    ...state,
    players: newPlayers,
    currentPlayer: nextPlayer,
    currentPlay: pattern,
    currentPlayPlayer: playerIdx,
    consecutivePasses: 0,
    bombCount: newBombCount,
    rocketCount: newRocketCount,
    playHistory: [
      ...state.playHistory,
      { player: playerIdx, cards: selected },
    ],
  };

  // 检查是否有人出完
  newState = checkWin(newState);
  return newState;
}

/** AI 决策叫地主 */
export function aiBidDecision(state: DoudizhuState): BidAction {
  const player = state.players[state.currentPlayer];
  // 简单策略：手牌中有大王或小王或2较多就叫
  let strength = 0;
  for (const card of player.hand) {
    const v = getCardValue(card);
    if (v >= 15) strength += 2;
    else if (v >= 12) strength += 1;
  }
  // 有炸弹额外加分
  const counts = new Map<number, number>();
  for (const card of player.hand) {
    const v = getCardValue(card);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  for (const [, count] of counts) {
    if (count === 4) strength += 3;
  }
  return strength >= 5 ? "call" : "pass";
}

/** AI 决策出牌 */
export function aiPlayDecision(state: DoudizhuState): PlayAction {
  const player = state.players[state.currentPlayer];
  const suggestion = suggestPlay(player.hand, state.currentPlay);

  if (!suggestion) {
    // 不能管则 pass
    return { type: "pass" };
  }

  // 简单策略：如果手牌很少（<=2），直接出完；否则按推荐出
  if (player.hand.length <= 2) {
    return { type: "play", cards: suggestion };
  }

  // 有炸弹在手，且不是必须管的时候，考虑保留炸弹
  const pattern = detectHandPattern(suggestion);
  if (pattern?.type === "bomb" || pattern?.type === "rocket") {
    // 如果当前没有出牌压力（首家），优先出小牌
    if (!state.currentPlay) {
      const smallSuggestion = suggestPlay(
        player.hand.filter((c) => {
          const p = detectHandPattern([c]);
          return p?.type !== "bomb" && p?.type !== "rocket";
        }),
        null
      );
      if (smallSuggestion) {
        return { type: "play", cards: smallSuggestion };
      }
    }
  }

  return { type: "play", cards: suggestion };
}

/** 获取玩家角色名称 */
export function getRoleName(role: PlayerRole | null): string {
  if (role === "landlord") return "地主";
  if (role === "peasant") return "农民";
  return "";
}

/** 获取玩家显示名称 */
export function getPlayerName(index: PlayerIndex, isAI: boolean): string {
  if (index === 0) return "玩家";
  return isAI ? `电脑${index}` : `玩家${index}`;
}
