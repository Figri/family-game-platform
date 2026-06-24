/**
 * 四川麻将（血战到底）游戏逻辑
 */

import {
  type Tile,
  type Suit,
  createDeck,
  shuffleDeck,
  dealHands,
  sortTiles,
  canPong,
  canKong,
  canConcealedKong,
  canAddKong,
  canHu,
  canHuGeneral,
  aiSelectLack,
  aiSelectDiscard,
  hasFinishedLack,
  performSwap,
  selectSwapTiles,
  isSameTile,
} from "./mahjong";

export interface GameRules {
  enablePong: boolean;
  enableMingKong: boolean;
  enableAnKong: boolean;
  enableBuKong: boolean;
  enableQiangGangHu: boolean;
  enableDianPao: boolean;
  enableZiMoFan: boolean;
  enableGangShangKaiHua: boolean;
  enableHaiDiLaoYue: boolean;
  enableSwapThree: boolean;
  enableLack: boolean;
}

export const DEFAULT_RULES: GameRules = {
  enablePong: true,
  enableMingKong: true,
  enableAnKong: true,
  enableBuKong: true,
  enableQiangGangHu: true,
  enableDianPao: true,
  enableZiMoFan: true,
  enableGangShangKaiHua: true,
  enableHaiDiLaoYue: true,
  enableSwapThree: true,
  enableLack: true,
};

export interface PlayerState {
  hand: Tile[];
  exposed: Tile[][]; // 碰/杠的牌组
  lack: Suit | null;
  hasHu: boolean;
  huTile: Tile | null;
  isZimo: boolean;
  score: number;
  isAI: boolean;
  name: string;
}

export type GamePhase =
  | "idle"
  | "swapping"
  | "lacking"
  | "playing"
  | "waiting_action"
  | "game_over";

export interface GameState {
  players: PlayerState[];
  wall: Tile[];
  discardPile: { tile: Tile; player: number }[];
  currentPlayer: number;
  dealer: number;
  phase: GamePhase;
  turn: number;
  lastDiscard: Tile | null;
  lastDraw: Tile | null;
  pendingAction: {
    type: "pong" | "kong" | "hu" | "addKong";
    player: number;
    tile: Tile;
    sourcePlayer: number;
  } | null;
  winnerOrder: number[];
  scores: number[];
  message: string;
  gangShangKaiHua: boolean;
  haiDiLaoYue: boolean;
}

export function createInitialState(rules: GameRules): GameState {
  const deck = shuffleDeck(createDeck());
  const { hands, wall } = dealHands(deck, 4);

  const players: PlayerState[] = [
    {
      hand: sortTiles(hands[0]),
      exposed: [],
      lack: null,
      hasHu: false,
      huTile: null,
      isZimo: false,
      score: 0,
      isAI: false,
      name: "玩家",
    },
    {
      hand: sortTiles(hands[1]),
      exposed: [],
      lack: null,
      hasHu: false,
      huTile: null,
      isZimo: false,
      score: 0,
      isAI: true,
      name: "AI东",
    },
    {
      hand: sortTiles(hands[2]),
      exposed: [],
      lack: null,
      hasHu: false,
      huTile: null,
      isZimo: false,
      score: 0,
      isAI: true,
      name: "AI南",
    },
    {
      hand: sortTiles(hands[3]),
      exposed: [],
      lack: null,
      hasHu: false,
      huTile: null,
      isZimo: false,
      score: 0,
      isAI: true,
      name: "AI西",
    },
  ];

  return {
    players,
    wall,
    discardPile: [],
    currentPlayer: 0,
    dealer: 0,
    phase: rules.enableSwapThree ? "swapping" : rules.enableLack ? "lacking" : "playing",
    turn: 0,
    lastDiscard: null,
    lastDraw: null,
    pendingAction: null,
    winnerOrder: [],
    scores: [0, 0, 0, 0],
    message: rules.enableSwapThree ? "请选择三张同花色的牌进行交换" : rules.enableLack ? "请选择定缺花色" : "游戏开始",
    gangShangKaiHua: false,
    haiDiLaoYue: false,
  };
}

/** 玩家选择换三张 */
export function playerSelectSwap(
  state: GameState,
  playerIndex: number,
  tiles: Tile[]
): GameState {
  if (state.phase !== "swapping") return state;
  const newState = cloneState(state);
  // 从手牌移除选中的牌
  for (const t of tiles) {
    const idx = newState.players[playerIndex].hand.findIndex((x) => x.id === t.id);
    if (idx >= 0) newState.players[playerIndex].hand.splice(idx, 1);
  }
  // 暂存到exposed[0]作为标记
  newState.players[playerIndex].exposed = [tiles];
  return newState;
}

/** 执行换三张 */
export function executeSwap(state: GameState): GameState {
  const newState = cloneState(state);
  const swaps = newState.players.map((p) => p.exposed[0] || []);

  // 检查是否都选好了
  if (swaps.some((s) => s.length !== 3)) {
    // AI自动选
    for (let i = 0; i < 4; i++) {
      if (swaps[i].length === 0) {
        const suit = aiSelectLack(newState.players[i].hand);
        const selected = selectSwapTiles(newState.players[i].hand, suit);
        if (selected.length === 3) {
          swaps[i] = selected;
          for (const t of selected) {
            const idx = newState.players[i].hand.findIndex((x) => x.id === t.id);
            if (idx >= 0) newState.players[i].hand.splice(idx, 1);
          }
        }
      }
    }
  }

  const hands = newState.players.map((p) => p.hand);
  const newHands = performSwap(hands, swaps);

  for (let i = 0; i < 4; i++) {
    newState.players[i].hand = sortTiles(newHands[i]);
    newState.players[i].exposed = [];
  }

  newState.phase = "lacking";
  newState.message = "请选择定缺花色（必须打完该花色才能胡牌）";
  return newState;
}

/** 玩家定缺 */
export function playerSetLack(state: GameState, playerIndex: number, lack: Suit): GameState {
  const newState = cloneState(state);
  newState.players[playerIndex].lack = lack;
  return newState;
}

/** AI自动定缺 */
export function aiAutoLack(state: GameState): GameState {
  const newState = cloneState(state);
  for (let i = 1; i < 4; i++) {
    if (!newState.players[i].lack) {
      newState.players[i].lack = aiSelectLack(newState.players[i].hand);
    }
  }
  return newState;
}

/** 检查是否所有人都定缺完毕 */
export function allLackSelected(state: GameState): boolean {
  return state.players.every((p) => p.lack !== null);
}

/** 开始游戏（定缺完成后） */
export function startGame(state: GameState): GameState {
  const newState = cloneState(state);
  newState.phase = "playing";
  newState.currentPlayer = newState.dealer;
  newState.message = `轮到${newState.players[newState.currentPlayer].name}摸牌`;
  return newState;
}

/** 摸牌 */
export function drawTile(state: GameState, playerIndex: number): GameState {
  const newState = cloneState(state);
  if (newState.wall.length === 0) {
    newState.message = "牌山已空，流局";
    newState.phase = "game_over";
    return newState;
  }

  const tile = newState.wall.pop()!;
  newState.players[playerIndex].hand.push(tile);
  newState.players[playerIndex].hand = sortTiles(newState.players[playerIndex].hand);
  newState.lastDraw = tile;

  // 检查海底捞月
  if (newState.wall.length === 0) {
    newState.haiDiLaoYue = true;
  }

  return newState;
}

/** 出牌 */
export function discardTile(state: GameState, playerIndex: number, tile: Tile): GameState {
  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;
  const idx = hand.findIndex((t) => t.id === tile.id);
  if (idx < 0) return state;

  hand.splice(idx, 1);
  newState.discardPile.push({ tile, player: playerIndex });
  newState.lastDiscard = tile;
  newState.lastDraw = null;

  // 检查其他玩家是否有操作
  const nextState = checkOtherPlayerActions(newState, playerIndex, tile);
  return nextState;
}

/** 检查其他玩家对打出的牌是否有操作 */
function checkOtherPlayerActions(
  state: GameState,
  discardPlayer: number,
  tile: Tile
): GameState {
  const newState = cloneState(state);

  // 按优先级检查胡->碰->杠（跳过已胡的玩家）
  for (let offset = 1; offset <= 3; offset++) {
    const p = (discardPlayer + offset) % 4;
    if (newState.players[p].hasHu) continue;

    const hand = newState.players[p].hand;

    // 胡
    if (canHu([...hand, tile])) {
      // 检查定缺
      if (newState.players[p].lack && !hasFinishedLack(hand, newState.players[p].lack)) {
        // 还有定缺花色，不能胡（简化规则）
      } else {
        newState.pendingAction = {
          type: "hu",
          player: p,
          tile,
          sourcePlayer: discardPlayer,
        };
        newState.phase = "waiting_action";
        newState.message = `${newState.players[p].name} 可以胡牌！`;
        return newState;
      }
    }
  }

  // 再检查碰/杠（按顺序）
  for (let offset = 1; offset <= 3; offset++) {
    const p = (discardPlayer + offset) % 4;
    if (newState.players[p].hasHu) continue;

    const hand = newState.players[p].hand;

    // 明杠
    if (canKong(hand, tile)) {
      newState.pendingAction = {
        type: "kong",
        player: p,
        tile,
        sourcePlayer: discardPlayer,
      };
      newState.phase = "waiting_action";
      newState.message = `${newState.players[p].name} 可以杠！`;
      return newState;
    }

    // 碰
    if (canPong(hand, tile)) {
      newState.pendingAction = {
        type: "pong",
        player: p,
        tile,
        sourcePlayer: discardPlayer,
      };
      newState.phase = "waiting_action";
      newState.message = `${newState.players[p].name} 可以碰！`;
      return newState;
    }
  }

  // 无人操作，轮到下家
  return nextPlayer(newState);
}

/** 执行碰 */
export function doPong(state: GameState): GameState {
  if (!state.pendingAction || state.pendingAction.type !== "pong") return state;
  const newState = cloneState(state);
  const action = newState.pendingAction!;
  const player = action.player;
  const tile = action.tile;

  const hand = newState.players[player].hand;
  const toRemove: Tile[] = [];
  for (const t of hand) {
    if (isSameTile(t, tile) && toRemove.length < 2) {
      toRemove.push(t);
    }
  }
  for (const t of toRemove) {
    const idx = hand.findIndex((x) => x.id === t.id);
    if (idx >= 0) hand.splice(idx, 1);
  }

  newState.players[player].exposed.push([tile, ...toRemove]);
  newState.pendingAction = null;
  newState.phase = "playing";
  newState.currentPlayer = player;
  newState.message = `${newState.players[player].name} 碰了 ${getTileDisplay(tile)}`;
  return newState;
}

/** 执行明杠 */
export function doKong(state: GameState): GameState {
  if (!state.pendingAction || state.pendingAction.type !== "kong") return state;
  const newState = cloneState(state);
  const action = newState.pendingAction!;
  const player = action.player;
  const tile = action.tile;

  const hand = newState.players[player].hand;
  const toRemove: Tile[] = [];
  for (const t of hand) {
    if (isSameTile(t, tile) && toRemove.length < 3) {
      toRemove.push(t);
    }
  }
  for (const t of toRemove) {
    const idx = hand.findIndex((x) => x.id === t.id);
    if (idx >= 0) hand.splice(idx, 1);
  }

  newState.players[player].exposed.push([tile, ...toRemove]);
  newState.pendingAction = null;
  newState.phase = "playing";
  newState.currentPlayer = player;
  newState.message = `${newState.players[player].name} 杠了 ${getTileDisplay(tile)}`;

  // 杠后摸牌（杠上开花）
  const afterDraw = drawTile(newState, player);
  afterDraw.gangShangKaiHua = true;
  return afterDraw;
}

/** 执行暗杠 */
export function doAnKong(state: GameState, playerIndex: number, tile: Tile): GameState {
  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;
  const toRemove: Tile[] = [];
  for (const t of hand) {
    if (isSameTile(t, tile) && toRemove.length < 4) {
      toRemove.push(t);
    }
  }
  if (toRemove.length !== 4) return state;

  for (const t of toRemove) {
    const idx = hand.findIndex((x) => x.id === t.id);
    if (idx >= 0) hand.splice(idx, 1);
  }

  newState.players[playerIndex].exposed.push([...toRemove]);
  newState.message = `${newState.players[playerIndex].name} 暗杠`;

  // 杠后摸牌
  const afterDraw = drawTile(newState, playerIndex);
  afterDraw.gangShangKaiHua = true;
  return afterDraw;
}

/** 执行补杠 */
export function doBuKong(state: GameState, playerIndex: number, tile: Tile): GameState {
  const newState = cloneState(state);
  const player = newState.players[playerIndex];

  // 找到对应的碰
  const meldIdx = player.exposed.findIndex(
    (m) => m.length === 3 && isSameTile(m[0], tile)
  );
  if (meldIdx < 0) return state;

  const handIdx = player.hand.findIndex((t) => isSameTile(t, tile));
  if (handIdx < 0) return state;

  player.hand.splice(handIdx, 1);
  player.exposed[meldIdx].push(tile);
  newState.message = `${player.name} 补杠`;

  // 检查抢杠胡
  for (let offset = 1; offset <= 3; offset++) {
    const p = (playerIndex + offset) % 4;
    if (newState.players[p].hasHu) continue;
    const testHand = [...newState.players[p].hand, tile];
    if (canHu(testHand)) {
      newState.pendingAction = {
        type: "hu",
        player: p,
        tile,
        sourcePlayer: playerIndex,
      };
      newState.phase = "waiting_action";
      newState.message = `${newState.players[p].name} 抢杠胡！`;
      return newState;
    }
  }

  // 杠后摸牌
  const afterDraw = drawTile(newState, playerIndex);
  afterDraw.gangShangKaiHua = true;
  return afterDraw;
}

/** 执行胡 */
export function doHu(state: GameState): GameState {
  if (!state.pendingAction || state.pendingAction.type !== "hu") return state;
  const newState = cloneState(state);
  const action = newState.pendingAction!;
  const player = action.player;
  const tile = action.tile;
  const sourcePlayer = action.sourcePlayer;

  const isZimo = player === sourcePlayer;
  newState.players[player].hasHu = true;
  newState.players[player].huTile = tile;
  newState.players[player].isZimo = isZimo;
  newState.winnerOrder.push(player);

  // 计分
  const baseScore = 1;
  let fan = 1;
  if (isZimo && newState.gangShangKaiHua) fan *= 2;
  if (newState.haiDiLaoYue) fan *= 2;
  if (isZimo) fan *= 2;

  const score = baseScore * fan;
  newState.players[player].score += score;

  // 点炮者扣分
  if (!isZimo) {
    newState.players[sourcePlayer].score -= score;
  } else {
    // 自摸：其他未胡玩家各扣分
    for (let i = 0; i < 4; i++) {
      if (i !== player && !newState.players[i].hasHu) {
        newState.players[i].score -= score / 3;
      }
    }
  }

  newState.pendingAction = null;
  newState.message = `${newState.players[player].name} 胡了！${isZimo ? "（自摸）" : "（点炮）"}`;

  // 血战到底：3家胡牌才结束
  if (newState.winnerOrder.length >= 3) {
    newState.phase = "game_over";
    newState.message = "游戏结束！";
    return newState;
  }

  // 胡牌者退出，继续游戏
  newState.phase = "playing";
  return nextPlayer(newState, player);
}

/** 过（放弃操作） */
export function doPass(state: GameState): GameState {
  if (!state.pendingAction) return state;
  const newState = cloneState(state);
  newState.pendingAction = null;
  newState.phase = "playing";
  return nextPlayer(newState);
}

/** 轮到下一家（跳过已胡玩家） */
function nextPlayer(state: GameState, fromPlayer?: number): GameState {
  const newState = cloneState(state);
  let p = fromPlayer !== undefined ? fromPlayer : newState.currentPlayer;
  for (let i = 0; i < 4; i++) {
    p = (p + 1) % 4;
    if (!newState.players[p].hasHu) {
      newState.currentPlayer = p;
      newState.message = `轮到${newState.players[p].name}`;
      return newState;
    }
  }
  // 都胡了或只剩一家
  newState.phase = "game_over";
  newState.message = "游戏结束！";
  return newState;
}

/** AI自动操作 */
export function aiTurn(state: GameState): GameState {
  const newState = cloneState(state);
  const playerIdx = newState.currentPlayer;
  const player = newState.players[playerIdx];
  if (!player.isAI || player.hasHu) return newState;

  // 如果还没摸牌（刚轮到），先摸牌
  if (newState.lastDraw === null || !player.hand.some((t) => t.id === newState.lastDraw?.id)) {
    const afterDraw = drawTile(newState, playerIdx);
    return aiTurn(afterDraw);
  }

  const hand = player.hand;
  const lack = player.lack;

  // 检查暗杠
  const anKongTile = canConcealedKong(hand);
  if (anKongTile) {
    return doAnKong(newState, playerIdx, anKongTile);
  }

  // 检查补杠
  const buKongTile = canAddKong(hand, player.exposed);
  if (buKongTile) {
    return doBuKong(newState, playerIdx, buKongTile);
  }

  // 检查自摸胡
  if (canHu(hand)) {
    if (!lack || hasFinishedLack(hand, lack)) {
      // 自摸胡
      newState.pendingAction = {
        type: "hu",
        player: playerIdx,
        tile: newState.lastDraw!,
        sourcePlayer: playerIdx,
      };
      return doHu(newState);
    }
  }

  // 出牌
  const discard = aiSelectDiscard(hand, lack);
  return discardTile(newState, playerIdx, discard);
}

/** AI响应其他玩家出牌 */
export function aiRespond(state: GameState): GameState {
  if (!state.pendingAction) return state;
  const newState = cloneState(state);
  const action = newState.pendingAction!;
  const player = newState.players[action.player];
  if (!player.isAI) return newState;

  // AI策略：能胡就胡，能杠就杠，能碰就碰
  if (action.type === "hu") {
    if (!player.lack || hasFinishedLack(player.hand, player.lack)) {
      return doHu(newState);
    }
  }
  if (action.type === "kong") {
    return doKong(newState);
  }
  if (action.type === "pong") {
    return doPong(newState);
  }

  return doPass(newState);
}

/** 克隆状态 */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
      exposed: p.exposed.map((m) => [...m]),
    })),
    wall: [...state.wall],
    discardPile: [...state.discardPile],
    scores: [...state.scores],
    winnerOrder: [...state.winnerOrder],
  };
}

/** 获取牌显示文本 */
function getTileDisplay(tile: Tile): string {
  if (tile.suit === "wind") {
    const names = ["", "东", "南", "西", "北"];
    return names[tile.value];
  }
  if (tile.suit === "dragon") {
    const names = ["", "中", "发", "白"];
    return names[tile.value];
  }
  const suitNames: Record<string, string> = { wan: "万", tiao: "条", tong: "筒" };
  return `${tile.value}${suitNames[tile.suit]}`;
}

/** 获取当前可进行操作的玩家 */
export function getCurrentPlayerAction(state: GameState): { player: number; actions: string[] } | null {
  if (state.phase === "waiting_action" && state.pendingAction) {
    const actions: string[] = [];
    if (state.pendingAction.type === "pong") actions.push("pong", "pass");
    if (state.pendingAction.type === "kong") actions.push("kong", "pass");
    if (state.pendingAction.type === "hu") actions.push("hu", "pass");
    return { player: state.pendingAction.player, actions };
  }
  if (state.phase === "playing" && !state.players[state.currentPlayer].isAI) {
    return { player: state.currentPlayer, actions: ["discard"] };
  }
  return null;
}

/** 检查玩家当前是否有暗杠/补杠 */
export function checkSelfKong(state: GameState, playerIndex: number): { anKong: Tile | null; buKong: Tile | null } {
  const hand = state.players[playerIndex].hand;
  return {
    anKong: canConcealedKong(hand),
    buKong: canAddKong(hand, state.players[playerIndex].exposed),
  };
}

/** 检查玩家是否可自摸胡 */
export function checkSelfHu(state: GameState, playerIndex: number): boolean {
  const hand = state.players[playerIndex].hand;
  const lack = state.players[playerIndex].lack;
  if (!canHu(hand)) return false;
  if (lack && !hasFinishedLack(hand, lack)) return false;
  return true;
}
