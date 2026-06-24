/**
 * 麻将牌系统
 * 四川麻将（血战到底）- 无花牌，共108张
 */

export type Suit = "wan" | "tiao" | "tong" | "wind" | "dragon";

export interface Tile {
  id: string;
  suit: Suit;
  value: number; // 万条筒1-9，风1-4(东南西北)，箭1-3(中发白)
}

export const WIND_NAMES = ["", "东", "南", "西", "北"];
export const DRAGON_NAMES = ["", "中", "发", "白"];

/** 生成唯一ID */
function makeId(suit: Suit, value: number, index: number): string {
  return `${suit}-${value}-${index}`;
}

/** 创建一副108张麻将牌（4张每种） */
export function createDeck(): Tile[] {
  const deck: Tile[] = [];
  let idx = 0;

  // 万、条、筒 各1-9，各4张
  for (const suit of ["wan", "tiao", "tong"] as Suit[]) {
    for (let value = 1; value <= 9; value++) {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: makeId(suit, value, idx++), suit, value });
      }
    }
  }

  // 风牌：东南西北，各4张
  for (const suit of ["wind"] as Suit[]) {
    for (let value = 1; value <= 4; value++) {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: makeId(suit, value, idx++), suit, value });
      }
    }
  }

  // 箭牌：中发白，各4张
  for (const suit of ["dragon"] as Suit[]) {
    for (let value = 1; value <= 3; value++) {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: makeId(suit, value, idx++), suit, value });
      }
    }
  }

  return deck;
}

/** 洗牌（Fisher-Yates） */
export function shuffleDeck(deck: Tile[]): Tile[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 发牌：每人13张，返回剩余牌山 */
export function dealHands(deck: Tile[], playerCount = 4): { hands: Tile[][]; wall: Tile[] } {
  const hands: Tile[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;
  for (let round = 0; round < 13; round++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(deck[idx++]);
    }
  }
  return { hands, wall: deck.slice(idx) };
}

/** 排序手牌：按花色再按数值 */
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<Suit, number> = { wan: 0, tiao: 1, tong: 2, wind: 3, dragon: 4 };
  return [...tiles].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.value - b.value;
  });
}

/** 判断两张牌是否相同（同花色同数值） */
export function isSameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

/** 获取花色名称 */
export function getSuitName(suit: Suit): string {
  switch (suit) {
    case "wan": return "万";
    case "tiao": return "条";
    case "tong": return "筒";
    case "wind": return "风";
    case "dragon": return "箭";
  }
}

/** 获取牌显示名称 */
export function getTileName(tile: Tile): string {
  if (tile.suit === "wind") return WIND_NAMES[tile.value];
  if (tile.suit === "dragon") return DRAGON_NAMES[tile.value];
  return `${tile.value}${getSuitName(tile.suit)}`;
}

/** 获取花色简称用于定缺 */
export function getSuitShortName(suit: Suit): string {
  switch (suit) {
    case "wan": return "万";
    case "tiao": return "条";
    case "tong": return "筒";
    default: return "";
  }
}

/** 判断是否为序数牌（万条筒） */
export function isNumberSuit(suit: Suit): boolean {
  return suit === "wan" || suit === "tiao" || suit === "tong";
}

/** 统计手牌中各牌的数量 */
export function countTiles(tiles: Tile[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tiles) {
    const key = `${t.suit}-${t.value}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/** 是否可碰：手牌中有两张与目标相同的牌 */
export function canPong(hand: Tile[], target: Tile): boolean {
  let count = 0;
  for (const t of hand) {
    if (isSameTile(t, target)) count++;
  }
  return count >= 2;
}

/** 是否可明杠：手牌中有三张与目标相同的牌 */
export function canKong(hand: Tile[], target: Tile): boolean {
  let count = 0;
  for (const t of hand) {
    if (isSameTile(t, target)) count++;
  }
  return count >= 3;
}

/** 是否可暗杠：手牌中有四张相同的牌 */
export function canConcealedKong(hand: Tile[]): Tile | null {
  const counts = countTiles(hand);
  for (const [key, count] of counts.entries()) {
    if (count === 4) {
      const [suit, value] = key.split("-");
      return { id: `ck-${key}`, suit: suit as Suit, value: Number(value) };
    }
  }
  return null;
}

/** 是否可补杠（加杠）：已碰的牌加一张 */
export function canAddKong(hand: Tile[], exposed: Tile[][]): Tile | null {
  for (const meld of exposed) {
    if (meld.length === 3) {
      // 碰的三张
      const first = meld[0];
      for (const t of hand) {
        if (isSameTile(t, first)) {
          return t;
        }
      }
    }
  }
  return null;
}

/** 是否可吃（四川麻将一般关闭） */
export function canChow(hand: Tile[], target: Tile): Tile[][] {
  if (!isNumberSuit(target.suit)) return [];
  const results: Tile[][] = [];
  const suit = target.suit;
  const v = target.value;

  // 需要找到连续的两张牌组合
  const find = (need1: number, need2: number) => {
    const t1 = hand.find((t) => t.suit === suit && t.value === need1);
    const t2 = hand.find((t) => t.suit === suit && t.value === need2);
    if (t1 && t2) return [t1, t2];
    return null;
  };

  // v-2, v-1
  if (v >= 3) {
    const pair = find(v - 2, v - 1);
    if (pair) results.push(pair);
  }
  // v-1, v+1
  if (v >= 2 && v <= 8) {
    const pair = find(v - 1, v + 1);
    if (pair) results.push(pair);
  }
  // v+1, v+2
  if (v <= 7) {
    const pair = find(v + 1, v + 2);
    if (pair) results.push(pair);
  }

  return results;
}

// ==================== 胡牌判断 ====================

/** 将手牌转为数值数组用于胡牌判断（仅序数牌） */
function suitToArray(tiles: Tile[], suit: Suit): number[] {
  return tiles.filter((t) => t.suit === suit).map((t) => t.value).sort((a, b) => a - b);
}

/** 判断一组序数牌是否能组成全顺子+将（将=对子） */
function canHuSuit(arr: number[]): boolean {
  if (arr.length === 0) return true;
  const counts = new Array(10).fill(0);
  for (const v of arr) counts[v]++;

  // 尝试每个数值作为将
  for (let jiang = 1; jiang <= 9; jiang++) {
    if (counts[jiang] < 2) continue;
    const temp = [...counts];
    temp[jiang] -= 2;
    if (canPartition(temp)) return true;
  }
  return false;
}

/** 判断去掉将后能否全部分解为刻子或顺子 */
function canPartition(counts: number[]): boolean {
  const c = [...counts];
  for (let i = 1; i <= 9; i++) {
    while (c[i] >= 3) {
      c[i] -= 3;
    }
    while (c[i] > 0) {
      if (i + 2 > 9 || c[i + 1] <= 0 || c[i + 2] <= 0) {
        return false;
      }
      c[i]--;
      c[i + 1]--;
      c[i + 2]--;
    }
  }
  return true;
}

/** 判断风牌/箭牌能否胡（只能刻子+将） */
function canHuHonor(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // 找将
  for (const [key, count] of counts.entries()) {
    if (count < 2) continue;
    const temp = new Map(counts);
    temp.set(key, count - 2);
    if ([...temp.values()].every((c) => c === 0 || c === 3)) return true;
  }
  return false;
}

/** 是否可胡（标准4副+1对） */
export function canHu(hand: Tile[]): boolean {
  if (hand.length !== 14 && hand.length !== 11 && hand.length !== 8 && hand.length !== 5 && hand.length !== 2) {
    // 未考虑碰杠减牌的情况，实际应根据已亮牌调整
    // 简单处理：手牌+3*碰/杠数 = 14
  }

  const suits: Suit[] = ["wan", "tiao", "tong"];
  const numberTiles = hand.filter((t) => isNumberSuit(t.suit));
  const honorTiles = hand.filter((t) => !isNumberSuit(t.suit));

  // 分别判断每种序数牌
  for (const suit of suits) {
    const arr = suitToArray(numberTiles, suit);
    if (!canHuSuit(arr)) return false;
  }

  // 判断风/箭牌
  if (!canHuHonor(honorTiles)) return false;

  return true;
}

/** 更通用的胡牌判断：支持已碰/杠的牌 */
export function canHuGeneral(hand: Tile[], exposed: Tile[][]): boolean {
  // 将已碰/杠的牌视为已经完成的副
  // 只需判断手牌能否组成剩余的部分
  // 手牌应有 14 - 3*exposed.length 张（碰）或更多变体
  const totalExposed = exposed.reduce((sum, m) => sum + m.length, 0);
  const expectedHand = 14 - totalExposed;
  if (hand.length !== expectedHand) return false;

  const suits: Suit[] = ["wan", "tiao", "tong"];
  const numberTiles = hand.filter((t) => isNumberSuit(t.suit));
  const honorTiles = hand.filter((t) => !isNumberSuit(t.suit));

  for (const suit of suits) {
    const arr = suitToArray(numberTiles, suit);
    if (!canHuSuit(arr)) return false;
  }

  if (!canHuHonor(honorTiles)) return false;

  return true;
}

/** 检查是否听牌（差一张胡） */
export function isTenpai(hand: Tile[]): Tile[] {
  const waits: Tile[] = [];
  // 遍历所有可能的牌
  const allSuits: Suit[] = ["wan", "tiao", "tong", "wind", "dragon"];
  const maxValues: Record<Suit, number> = { wan: 9, tiao: 9, tong: 9, wind: 4, dragon: 3 };

  for (const suit of allSuits) {
    for (let v = 1; v <= maxValues[suit]; v++) {
      const testTile: Tile = { id: `test-${suit}-${v}`, suit, value: v };
      const newHand = [...hand, testTile];
      if (canHu(newHand)) {
        waits.push(testTile);
      }
    }
  }
  return waits;
}

/** 换三张：选择三张同花色的牌 */
export function selectSwapTiles(hand: Tile[], suit: Suit): Tile[] {
  const sameSuit = hand.filter((t) => t.suit === suit);
  if (sameSuit.length < 3) return [];
  return sameSuit.slice(0, 3);
}

/** 执行换三张（与对家交换） */
export function performSwap(hands: Tile[][], swaps: Tile[][]): Tile[][] {
  const newHands = hands.map((h) => [...h]);
  // 0<->2, 1<->3
  const pairs = [
    [0, 2],
    [1, 3],
  ];
  for (const [a, b] of pairs) {
    const swapA = swaps[a];
    const swapB = swaps[b];
    if (!swapA || !swapB) continue;
    // 从A手牌移除swapA
    for (const t of swapA) {
      const idx = newHands[a].findIndex((x) => x.id === t.id);
      if (idx >= 0) newHands[a].splice(idx, 1);
    }
    // 从B手牌移除swapB
    for (const t of swapB) {
      const idx = newHands[b].findIndex((x) => x.id === t.id);
      if (idx >= 0) newHands[b].splice(idx, 1);
    }
    // 交换
    newHands[a].push(...swapB);
    newHands[b].push(...swapA);
  }
  return newHands;
}

/** AI选择定缺花色：选择手牌最少的花色 */
export function aiSelectLack(hand: Tile[]): Suit {
  const suits: Suit[] = ["wan", "tiao", "tong"];
  let minCount = Infinity;
  let lack: Suit = "wan";
  for (const suit of suits) {
    const count = hand.filter((t) => t.suit === suit).length;
    if (count < minCount) {
      minCount = count;
      lack = suit;
    }
  }
  return lack;
}

/** 检查是否已打完定缺花色 */
export function hasFinishedLack(hand: Tile[], lack: Suit | null): boolean {
  if (!lack) return true;
  return hand.every((t) => t.suit !== lack);
}

/** 获取牌的分值（用于AI出牌优先级） */
export function tilePriority(tile: Tile, hand: Tile[], lack: Suit | null): number {
  if (lack && tile.suit === lack) return 100; // 优先出定缺

  const counts = countTiles(hand);
  const key = `${tile.suit}-${tile.value}`;
  const count = counts.get(key) || 0;

  if (count >= 2) return 10; // 有搭子，后出

  // 孤张中，边张优先出
  if (isNumberSuit(tile.suit)) {
    if (tile.value === 1 || tile.value === 9) return 90;
    if (tile.value === 2 || tile.value === 8) return 80;
  }

  return 50;
}

/** AI选择出牌 */
export function aiSelectDiscard(hand: Tile[], lack: Suit | null): Tile {
  const sorted = [...hand].sort((a, b) => {
    const pa = tilePriority(a, hand, lack);
    const pb = tilePriority(b, hand, lack);
    return pb - pa; // 优先级高的先出
  });
  return sorted[0];
}
