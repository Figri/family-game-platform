"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { GameResultModal } from "@/components/game-result-modal";
import { MahjongTile, MahjongExposed } from "./mahjong-tile";

import { type Tile } from "@/lib/games/mahjong";
import {
  type GameState,
  type GameRules,
  createInitialState,
  discardTile,
  doPong,
  doKong,
  doAnKong,
  doBuKong,
  doHu,
  doPass,
  aiTurn,
  aiRespond,
  checkSelfKong,
  checkSelfHu,
} from "@/lib/games/sichuan-mahjong";

interface MahjongGameProps {
  rules?: GameRules;
  onBack?: () => void;
}

const DEFAULT_RULES: GameRules = {
  enablePong: true,
  enableMingKong: true,
  enableAnKong: true,
  enableBuKong: true,
  enableDianPao: true,
  enableZiMo: true,
};

// 玩家座位：0=自己(底)，1=右家，2=对家(顶)，3=左家
const SEAT_NAMES = ["玩家", "右家", "对家", "左家"];

/** 对手牌背 - 横向排列（对家） */
function OpponentHandHorizontal({ count }: { count: number }) {
  const showCount = Math.min(count, 12);
  return (
    <div className="flex items-center justify-center">
      <div className="flex">
        {Array.from({ length: showCount }).map((_, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <MahjongTile faceDown size="xs" />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-white/70 ml-1.5">{count}张</span>
    </div>
  );
}

/** 对手牌背 - 竖向排列（左右家） */
function OpponentHandVertical({ count }: { count: number }) {
  const showCount = Math.min(count, 8);
  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col">
        {Array.from({ length: showCount }).map((_, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 0 : -10 }}>
            <MahjongTile faceDown size="xs" />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-white/70 mt-1">{count}张</span>
    </div>
  );
}

/** 玩家信息头像 */
function PlayerAvatar({
  name,
  isCurrent,
  isDealer,
  hasHu,
  position,
}: {
  name: string;
  isCurrent: boolean;
  isDealer: boolean;
  hasHu: boolean;
  position: "bottom" | "top" | "left" | "right";
}) {
  const isVertical = position === "left" || position === "right";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-1 border-2",
        isCurrent
          ? "border-yellow-400 bg-yellow-900/40"
          : "border-white/15 bg-black/30"
      )}
      style={{ flexDirection: isVertical ? "column" : "row" }}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          hasHu ? "bg-yellow-500 text-white" : "bg-blue-500/70 text-white"
        )}
      >
        {name.charAt(0)}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-bold text-white leading-tight">
          {name}
          {isDealer && <span className="text-yellow-400 ml-0.5">庄</span>}
        </span>
      </div>
      {isCurrent && (
        <span className="text-[9px] font-bold text-yellow-300 animate-pulse">
          回合中
        </span>
      )}
    </div>
  );
}

/** 弃牌区 - 按玩家分区域显示 */
function DiscardArea({
  discards,
}: {
  discards: { tile: Tile; player: number }[];
}) {
  // 按玩家分组
  const byPlayer = useMemo(() => {
    const groups: Tile[][] = [[], [], [], []];
    for (const d of discards) {
      groups[d.player].push(d.tile);
    }
    return groups;
  }, [discards]);

  // 每个区域最多显示的牌数
  const maxShow = 18;

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* 自己的弃牌 - 底部 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full flex justify-center px-2">
        <div className="flex flex-wrap justify-center gap-0.5 max-w-[70%]">
          {byPlayer[0].slice(-maxShow).map((t, i) => (
            <MahjongTile key={i} tile={t} size="xs" />
          ))}
        </div>
      </div>

      {/* 对家弃牌 - 顶部 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center px-2">
        <div className="flex flex-wrap justify-center gap-0.5 max-w-[70%]">
          {byPlayer[2].slice(-maxShow).map((t, i) => (
            <MahjongTile key={i} tile={t} size="xs" />
          ))}
        </div>
      </div>

      {/* 左家弃牌 - 左侧 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full flex flex-col justify-center">
        <div className="flex flex-col gap-0.5 max-h-[70%] flex-wrap content-center">
          {byPlayer[3].slice(-maxShow).map((t, i) => (
            <MahjongTile key={i} tile={t} size="xs" />
          ))}
        </div>
      </div>

      {/* 右家弃牌 - 右侧 */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-full flex flex-col justify-center">
        <div className="flex flex-col gap-0.5 max-h-[70%] flex-wrap content-center">
          {byPlayer[1].slice(-maxShow).map((t, i) => (
            <MahjongTile key={i} tile={t} size="xs" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 底部手牌区 */
function PlayerHand({
  tiles,
  selectedId,
  onClickTile,
  disabled,
  lastDrawId,
}: {
  tiles: Tile[];
  selectedId: string | null;
  onClickTile: (tile: Tile) => void;
  disabled: boolean;
  lastDrawId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tileCount = tiles.length;
  const gap = 3;
  const lastDrawGap = 10;

  // 计算牌宽以适应一行
  const tileWidth = useMemo(() => {
    if (tileCount === 0) return 40;
    const gaps = (tileCount - 1) * gap;
    const extra = lastDrawId ? lastDrawGap : 0;
    const available = containerWidth - gaps - extra - 16;
    const w = available / tileCount;
    return Math.max(28, Math.min(w, 52));
  }, [containerWidth, tileCount, lastDrawId]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center items-end"
      style={{ height: tileWidth / 0.7 + 12 }}
    >
      <div className="flex items-end" style={{ gap }}>
        {tiles.map((tile, idx) => {
          const isSelected = selectedId === tile.id;
          const isLastDraw = tile.id === lastDrawId;
          const prevIsLastDraw = idx > 0 && tiles[idx - 1].id === lastDrawId;
          return (
            <div
              key={tile.id}
              style={{
                marginLeft: prevIsLastDraw ? lastDrawGap : 0,
                transform: isSelected ? "translateY(-10px)" : "translateY(0)",
                transition: "transform 0.12s ease",
                zIndex: isSelected ? 10 : 1,
                position: "relative",
              }}
            >
              <MahjongTile
                tile={tile}
                size="hand"
                selected={isSelected}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onClickTile(tile);
                }}
                style={{ width: tileWidth }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MahjongGame({ rules, onBack }: MahjongGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedDiscard, setSelectedDiscard] = useState<Tile | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化
  useEffect(() => {
    const state = createInitialState(rules ?? DEFAULT_RULES);
    setGameState(state);
  }, [rules]);

  // AI 自动操作
  useEffect(() => {
    if (!gameState) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    // 等待操作阶段（碰/杠/胡）
    if (gameState.phase === "waiting_action" && gameState.pendingAction) {
      const actionPlayer = gameState.pendingAction.player;
      if (gameState.players[actionPlayer].isAI) {
        timerRef.current = setTimeout(() => {
          setGameState((prev) => (prev ? aiRespond(prev) : prev));
        }, 1200);
      }
    }
    // 出牌阶段
    else if (gameState.phase === "playing") {
      const current = gameState.currentPlayer;
      if (gameState.players[current].isAI && !gameState.players[current].hasHu) {
        timerRef.current = setTimeout(() => {
          setGameState((prev) => (prev ? aiTurn(prev) : prev));
        }, 1500);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState]);

  // 操作回调
  const handleDiscard = useCallback((tile: Tile) => {
    setGameState((prev) => {
      if (!prev) return prev;
      setSelectedDiscard(null);
      return discardTile(prev, 0, tile);
    });
  }, []);

  const handlePong = useCallback(() => {
    setGameState((prev) => (prev ? doPong(prev) : prev));
  }, []);

  const handleKong = useCallback(() => {
    setGameState((prev) => (prev ? doKong(prev) : prev));
  }, []);

  const handleAnKong = useCallback((tile: Tile) => {
    setGameState((prev) => (prev ? doAnKong(prev, 0, tile) : prev));
  }, []);

  const handleBuKong = useCallback((tile: Tile) => {
    setGameState((prev) => (prev ? doBuKong(prev, 0, tile) : prev));
  }, []);

  const handleHu = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return doHu(prev);
    });
  }, []);

  const handlePass = useCallback(() => {
    setGameState((prev) => (prev ? doPass(prev) : prev));
  }, []);

  const handleRestart = useCallback(() => {
    setSelectedDiscard(null);
    const state = createInitialState(rules ?? DEFAULT_RULES);
    setGameState(state);
  }, [rules]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#1B5E20]">
        <div className="text-xl text-white animate-pulse">加载中...</div>
      </div>
    );
  }

  const player = gameState.players[0];
  const isPlayerTurn =
    gameState.currentPlayer === 0 && gameState.phase === "playing";
  const isWaitingAction =
    gameState.phase === "waiting_action" &&
    gameState.pendingAction?.player === 0;
  const selfKong = checkSelfKong(gameState, 0);
  const canSelfHu =
    isPlayerTurn && gameState.lastDraw && checkSelfHu(gameState, 0);

  const showResult = gameState.gameResult !== null;
  const resultType = gameState.gameResult?.winnerName === "玩家" ? "win" : "lose";

  return (
    <div
      className="relative w-full h-full flex flex-col select-none"
      style={{
        background:
          "radial-gradient(ellipse at center, #2E7D32 0%, #1B5E20 60%, #0D3B10 100%)",
      }}
    >
      {/* ===== 顶部状态栏 ===== */}
      <header className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-lg text-white/80 hover:text-white hover:scale-110 transition-all"
              aria-label="返回"
            >
              ←
            </button>
          )}
          <span className="text-sm font-bold text-white">麻将</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/80">
          <span>剩余: {gameState.wall.length}</span>
          <span>庄: {SEAT_NAMES[gameState.dealer]}</span>
        </div>
      </header>

      {/* ===== 牌桌主区域 ===== */}
      <main className="flex-1 relative min-h-0 px-1 py-1">
        {/* 对家（顶部） */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
          <PlayerAvatar
            name={gameState.players[2].name}
            isCurrent={
              gameState.currentPlayer === 2 && gameState.phase === "playing"
            }
            isDealer={gameState.dealer === 2}
            hasHu={gameState.players[2].hasHu}
            position="top"
          />
          <OpponentHandHorizontal count={gameState.players[2].hand.length} />
          {gameState.players[2].exposed.length > 0 && (
            <MahjongExposed melds={gameState.players[2].exposed} size="xs" />
          )}
        </div>

        {/* 左家 */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <PlayerAvatar
            name={gameState.players[3].name}
            isCurrent={
              gameState.currentPlayer === 3 && gameState.phase === "playing"
            }
            isDealer={gameState.dealer === 3}
            hasHu={gameState.players[3].hasHu}
            position="left"
          />
          <OpponentHandVertical count={gameState.players[3].hand.length} />
          {gameState.players[3].exposed.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {gameState.players[3].exposed.map((meld, idx) => (
                <div key={idx} className="flex gap-0.5">
                  {meld.map((tile, tIdx) => (
                    <MahjongTile key={tIdx} tile={tile} size="xs" />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右家 */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          <PlayerAvatar
            name={gameState.players[1].name}
            isCurrent={
              gameState.currentPlayer === 1 && gameState.phase === "playing"
            }
            isDealer={gameState.dealer === 1}
            hasHu={gameState.players[1].hasHu}
            position="right"
          />
          <OpponentHandVertical count={gameState.players[1].hand.length} />
          {gameState.players[1].exposed.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {gameState.players[1].exposed.map((meld, idx) => (
                <div key={idx} className="flex gap-0.5">
                  {meld.map((tile, tIdx) => (
                    <MahjongTile key={tIdx} tile={tile} size="xs" />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 中央弃牌区 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative rounded-lg border border-white/10 bg-black/10"
            style={{ width: "55%", height: "60%" }}
          >
            <DiscardArea discards={gameState.discardPile} />
          </div>
        </div>
      </main>

      {/* ===== 底部操作区域 ===== */}
      <footer className="shrink-0 flex flex-col items-center gap-1 pb-2 pt-1 bg-black/10 border-t border-white/5">
        {/* 操作按钮栏 */}
        <div className="flex items-center justify-center gap-2 min-h-[32px]">
          {/* 出牌按钮 */}
          {isPlayerTurn && selectedDiscard && (
            <button
              onClick={() => handleDiscard(selectedDiscard)}
              className="h-8 px-4 rounded-md text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all shadow-md"
            >
              出牌
            </button>
          )}

          {/* 自摸胡 */}
          {canSelfHu && (
            <button
              onClick={handleHu}
              className="h-8 px-4 rounded-md text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-md animate-pulse"
            >
              胡
            </button>
          )}

          {/* 碰 */}
          {isWaitingAction && gameState.pendingAction?.type === "pong" && (
            <>
              <button
                onClick={handlePong}
                className="h-8 px-4 rounded-md text-sm font-bold text-white bg-green-500 hover:bg-green-600 active:scale-95 transition-all shadow-md"
              >
                碰
              </button>
              <button
                onClick={handlePass}
                className="h-8 px-4 rounded-md text-sm font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all"
              >
                过
              </button>
            </>
          )}

          {/* 杠 */}
          {isWaitingAction && gameState.pendingAction?.type === "kong" && (
            <>
              <button
                onClick={handleKong}
                className="h-8 px-4 rounded-md text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all shadow-md"
              >
                杠
              </button>
              <button
                onClick={handlePass}
                className="h-8 px-4 rounded-md text-sm font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all"
              >
                过
              </button>
            </>
          )}

          {/* 胡（点炮） */}
          {isWaitingAction && gameState.pendingAction?.type === "hu" && (
            <>
              <button
                onClick={handleHu}
                className="h-8 px-4 rounded-md text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all shadow-md animate-pulse"
              >
                胡
              </button>
              <button
                onClick={handlePass}
                className="h-8 px-4 rounded-md text-sm font-bold text-white/80 bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all"
              >
                过
              </button>
            </>
          )}

          {/* 暗杠 */}
          {isPlayerTurn && selfKong.anKong && (
            <button
              onClick={() => handleAnKong(selfKong.anKong!)}
              className="h-8 px-3 rounded-md text-sm font-bold text-white bg-blue-500/80 hover:bg-blue-600 active:scale-95 transition-all"
            >
              暗杠
            </button>
          )}

          {/* 补杠 */}
          {isPlayerTurn && selfKong.buKong && (
            <button
              onClick={() => handleBuKong(selfKong.buKong!)}
              className="h-8 px-3 rounded-md text-sm font-bold text-white bg-teal-500/80 hover:bg-teal-600 active:scale-95 transition-all"
            >
              补杠
            </button>
          )}

          {/* 等待提示 */}
          {!isPlayerTurn && !isWaitingAction && gameState.phase === "playing" && (
            <span className="text-xs text-white/50">
              {gameState.players[gameState.currentPlayer].name} 思考中...
            </span>
          )}
        </div>

        {/* 自己的碰/杠牌 */}
        {player.exposed.length > 0 && (
          <div className="flex justify-center">
            <MahjongExposed melds={player.exposed} size="sm" />
          </div>
        )}

        {/* 手牌 */}
        <div className="w-full px-2">
          <PlayerHand
            tiles={player.hand}
            selectedId={selectedDiscard?.id ?? null}
            onClickTile={(tile) => {
              if (isPlayerTurn && gameState.lastDraw) {
                setSelectedDiscard((prev) =>
                  prev?.id === tile.id ? null : tile
                );
              }
            }}
            disabled={!isPlayerTurn || !gameState.lastDraw}
            lastDrawId={gameState.lastDraw?.id ?? null}
          />
        </div>
      </footer>

      {/* ===== 游戏结果弹窗 ===== */}
      <GameResultModal
        result={showResult ? resultType : null}
        message={gameState.gameResult?.isZimo
          ? `${gameState.gameResult.winnerName} 自摸胡牌！`
          : `${gameState.gameResult?.winnerName} 胡牌！${gameState.gameResult?.sourceName ? `（${gameState.gameResult.sourceName}点炮）` : ""}`
        }
        onRestart={handleRestart}
        onBack={() => {
          if (onBack) onBack();
        }}
      />
    </div>
  );
}
