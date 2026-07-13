"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { type Tile, type Suit, getSuitShortName } from "@/lib/games/mahjong";
import {
  type GameState,
  type GameRules,
  type GamePhase,
  createInitialState,
  playerSelectSwap,
  executeSwap,
  playerSetLack,
  aiAutoLack,
  allLackSelected,
  startGame,
  drawTile,
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
  getCurrentPlayerAction,
} from "@/lib/games/sichuan-mahjong";
import { MahjongTile, MahjongExposed, MahjongDiscard } from "./mahjong-tile";

interface SichuanMahjongGameProps {
  rules?: GameRules;
  onBack?: () => void;
}

const SUITS: Suit[] = ["wan", "tiao", "tong"];

/** 紧凑手牌布局 - 使用绝对定位实现重叠 */
function CompactHand({
  tiles,
  selectedIds,
  onClickTile,
  disabled = false,
  lastDrawId,
}: {
  tiles: Tile[];
  selectedIds?: string[];
  onClickTile?: (tile: Tile) => void;
  disabled?: boolean;
  /** 最近摸到的牌的 id，用于视觉分离 */
  lastDrawId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // clamp(28px, 6vw, 48px) for tile width
  const tileWidth = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 375;
    const w = Math.min(Math.max(Math.floor(vw * 0.06), 28), 48);
    return w;
  }, []);

  // 计算步长：紧凑排列
  const step = useMemo(() => {
    const paddingX = 12;
    const availableWidth = containerWidth - paddingX;
    const tileCount = tiles.length;
    if (tileCount <= 1) return tileWidth;
    const naturalWidth = tileWidth * tileCount;
    let s = tileWidth;
    if (naturalWidth > availableWidth) {
      s = (availableWidth - tileWidth) / (tileCount - 1);
    }
    return Math.max(s, tileWidth * 0.22);
  }, [tiles.length, tileWidth, containerWidth]);

  const tileHeight = Math.floor(tileWidth * 1.4);

  return (
    <div
      ref={containerRef}
      className="relative flex items-end justify-center w-full"
      style={{ height: tileHeight + 12 }}
    >
      <div
        className="relative"
        style={{
          width: step * (tiles.length - 1) + tileWidth,
          height: tileHeight + 12,
        }}
      >
        {tiles.map((tile, idx) => {
          const isSelected = selectedIds?.includes(tile.id);
          const isLastDraw = tile.id === lastDrawId;
          // 摸到的牌保留稍大间距（视觉上分离）
          const extraGap = isLastDraw && idx > 0 ? 6 : 0;
          return (
            <div
              key={tile.id}
              className="absolute top-0"
              style={{
                left: idx * step + extraGap,
                zIndex: idx + (isSelected ? 100 : 0),
                transform: isSelected ? "translateY(-8px)" : "translateY(0)",
                transition: "transform 0.15s ease",
              }}
            >
              <MahjongTile
                tile={tile}
                selected={isSelected}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) onClickTile?.(tile);
                }}
                size="hand"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 其他玩家的牌背 - 只显示有限数量 */
function OpponentTileBacks({
  count,
  variant,
}: {
  count: number;
  variant: "top" | "left" | "right";
}) {
  const showCount = Math.min(Math.max(Math.min(count, 5), 5), 8);

  if (variant === "top") {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: showCount }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-8 rounded border border-border bg-muted shrink-0"
          >
            <div className="w-3/4 h-3/4 rounded-sm bg-muted-foreground/20 mx-auto mt-[3px]" />
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          剩余 {count} 张
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {Array.from({ length: showCount }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-8 rounded border border-border bg-muted shrink-0"
        >
          <div className="w-3/4 h-3/4 rounded-sm bg-muted-foreground/20 mx-auto mt-[3px]" />
        </div>
      ))}
      <span className="text-xs text-muted-foreground mt-0.5">
        剩余 {count} 张
      </span>
    </div>
  );
}

export function SichuanMahjongGame({ rules, onBack }: SichuanMahjongGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSwapTiles, setSelectedSwapTiles] = useState<Tile[]>([]);
  const [selectedDiscard, setSelectedDiscard] = useState<Tile | null>(null);
  const [showHuDialog, setShowHuDialog] = useState(false);
  const [huInfo, setHuInfo] = useState<{ isZimo: boolean; tile: Tile } | null>(null);
  const elderlyMode = false;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化游戏
  useEffect(() => {
    const state = createInitialState(rules ?? {
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
    });
    setGameState(state);
  }, [rules]);

  // AI自动操作循环
  useEffect(() => {
    if (!gameState) return;

    if (gameState.phase === "waiting_action" && gameState.pendingAction) {
      const actionPlayer = gameState.pendingAction.player;
      if (gameState.players[actionPlayer].isAI) {
        timerRef.current = setTimeout(() => {
          setGameState((prev) => (prev ? aiRespond(prev) : prev));
        }, 1000);
      }
    } else if (gameState.phase === "playing") {
      const current = gameState.currentPlayer;
      if (gameState.players[current].isAI && !gameState.players[current].hasHu) {
        timerRef.current = setTimeout(() => {
          setGameState((prev) => (prev ? aiTurn(prev) : prev));
        }, 1200);
      }
    } else if (gameState.phase === "lacking") {
      const needAiLack = gameState.players.some((p, i) => i !== 0 && !p.lack);
      if (needAiLack) {
        timerRef.current = setTimeout(() => {
          setGameState((prev) => {
            if (!prev) return prev;
            const after = aiAutoLack(prev);
            if (allLackSelected(after)) {
              return startGame(after);
            }
            return after;
          });
        }, 800);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState]);

  // 玩家选择换三张
  const handleSelectSwap = useCallback((tile: Tile) => {
    setSelectedSwapTiles((prev) => {
      const exists = prev.find((t) => t.id === tile.id);
      if (exists) return prev.filter((t) => t.id !== tile.id);
      if (prev.length >= 3) return prev;
      if (prev.length > 0 && prev[0].suit !== tile.suit) return prev;
      return [...prev, tile];
    });
  }, []);

  const handleConfirmSwap = useCallback(() => {
    if (selectedSwapTiles.length !== 3) return;
    setGameState((prev) => {
      if (!prev) return prev;
      const after = playerSelectSwap(prev, 0, selectedSwapTiles);
      const afterAi = executeSwap(after);
      return afterAi;
    });
    setSelectedSwapTiles([]);
  }, [selectedSwapTiles]);

  // 玩家定缺
  const handleSetLack = useCallback((lack: Suit) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const after = playerSetLack(prev, 0, lack);
      if (allLackSelected(after)) {
        return startGame(after);
      }
      return after;
    });
  }, []);

  // 玩家摸牌
  const handleDraw = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return drawTile(prev, 0);
    });
  }, []);

  // 玩家出牌
  const handleDiscard = useCallback((tile: Tile) => {
    setGameState((prev) => {
      if (!prev) return prev;
      setSelectedDiscard(null);
      return discardTile(prev, 0, tile);
    });
  }, []);

  // 玩家操作
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
      setShowHuDialog(false);
      return doHu(prev);
    });
  }, []);

  const handlePass = useCallback(() => {
    setGameState((prev) => (prev ? doPass(prev) : prev));
    setShowHuDialog(false);
  }, []);

  // 检查玩家自摸胡弹窗
  useEffect(() => {
    if (!gameState) return;
    if (gameState.phase === "playing" && gameState.currentPlayer === 0 && !gameState.players[0].isAI) {
      const canHu = checkSelfHu(gameState, 0);
      if (canHu && gameState.lastDraw && !showHuDialog) {
        setHuInfo({ isZimo: true, tile: gameState.lastDraw });
        setShowHuDialog(true);
      }
    }
  }, [gameState, showHuDialog]);

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-2xl animate-pulse">加载中...</div>
      </div>
    );
  }

  const player = gameState.players[0];
  const currentAction = getCurrentPlayerAction(gameState);
  const selfKong = checkSelfKong(gameState, 0);

  // 换三张阶段
  if (gameState.phase === "swapping") {
    return (
      <div className="flex flex-col items-center gap-4 p-4 overflow-hidden">
        <h2 className="text-lg font-bold">换三张</h2>
        <p className="text-sm text-muted-foreground">
          请选择三张同花色的牌
        </p>
        <CompactHand
          tiles={player.hand}
          selectedIds={selectedSwapTiles.map((t) => t.id)}
          onClickTile={handleSelectSwap}
        />
        <div className="flex gap-3">
          <Button
            onClick={handleConfirmSwap}
            disabled={selectedSwapTiles.length !== 3}
            className="h-12 text-base px-6"
          >
            确认换牌
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedSwapTiles([])}
            className="h-12 text-base px-4"
          >
            重新选择
          </Button>
        </div>
      </div>
    );
  }

  // 定缺阶段
  if (gameState.phase === "lacking") {
    return (
      <div className="flex flex-col items-center gap-4 p-4 overflow-hidden">
        <h2 className="text-lg font-bold">定缺</h2>
        <p className="text-sm text-muted-foreground">
          选择一门花色，必须打完该花色才能胡牌
        </p>
        <div className="flex gap-3">
          {SUITS.map((suit) => (
            <Button
              key={suit}
              onClick={() => handleSetLack(suit)}
              variant={player.lack === suit ? "default" : "outline"}
              className="h-16 w-20 text-xl font-bold"
            >
              {getSuitShortName(suit)}
            </Button>
          ))}
        </div>
        {player.lack && (
          <p className="text-base text-primary font-semibold">
            你已选择定缺：{getSuitShortName(player.lack)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          等待其他玩家定缺...
        </p>
      </div>
    );
  }

  // 游戏结束
  if (gameState.phase === "game_over") {
    return (
      <div className="flex flex-col items-center gap-4 p-4 overflow-hidden">
        <h2 className="text-xl font-bold">游戏结束</h2>
        <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
          {gameState.players.map((p, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                p.hasHu ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">{p.name}</span>
                {p.hasHu && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                    {p.isZimo ? "自摸" : "胡牌"}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-lg font-bold",
                  p.score > 0 ? "text-red-600" : p.score < 0 ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {p.score > 0 ? `+${p.score}` : p.score}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              const state = createInitialState(rules ?? {
                enablePong: true, enableMingKong: true, enableAnKong: true,
                enableBuKong: true, enableQiangGangHu: true, enableDianPao: true,
                enableZiMoFan: true, enableGangShangKaiHua: true, enableHaiDiLaoYue: true,
                enableSwapThree: true, enableLack: true,
              });
              setGameState(state);
            }}
            className="h-12 text-base px-6"
          >
            再来一局
          </Button>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="h-12 text-base px-4"
            >
              返回菜单
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 正常游戏界面
  const isPlayerTurn = gameState.currentPlayer === 0 && gameState.phase === "playing";
  const isWaitingAction = gameState.phase === "waiting_action" && gameState.pendingAction?.player === 0;

  // 是否有任何可操作按钮需要显示
  const hasActionButtons =
    (isPlayerTurn && gameState.lastDraw && selectedDiscard) ||
    (isWaitingAction && (gameState.pendingAction?.type === "pong" || gameState.pendingAction?.type === "kong" || gameState.pendingAction?.type === "hu")) ||
    (isPlayerTurn && (selfKong.anKong || selfKong.buKong));

  return (
    <div className="flex flex-col h-full overflow-hidden gap-1 px-1">
      {/* 顶部信息栏 */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1">
        <div className="text-xs text-muted-foreground">
          剩余: {gameState.wall.length}
        </div>
        <div className="text-sm font-semibold">
          {gameState.message}
        </div>
        <div className="text-xs text-muted-foreground">
          得分: {player.score > 0 ? `+${player.score}` : player.score}
        </div>
      </div>

      {/* 上方玩家 (AI南，索引2) */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <span className="text-xs">
          {gameState.players[2].name}
          {gameState.players[2].hasHu && " OK"}
          {gameState.players[2].lack && ` [缺${getSuitShortName(gameState.players[2].lack)}]`}
        </span>
        <OpponentTileBacks count={gameState.players[2].hand.length} variant="top" />
        <MahjongExposed melds={gameState.players[2].exposed} size="sm" />
      </div>

      {/* 中间区域 */}
      <div className="flex-1 flex items-center justify-center gap-2 min-h-0 overflow-hidden">
        {/* 左侧玩家 (AI东，索引1) */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 w-14">
          <span className="text-xs truncate w-full text-center">
            {gameState.players[1].name}
            {gameState.players[1].hasHu && " OK"}
          </span>
          <OpponentTileBacks count={gameState.players[1].hand.length} variant="left" />
          <MahjongExposed melds={gameState.players[1].exposed} size="sm" />
        </div>

        {/* 中央：弃牌区 + 牌山 */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 min-h-0">
          <div className="relative">
            <MahjongDiscard discards={gameState.discardPile} size="sm" />
            {gameState.lastDiscard && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <MahjongTile tile={gameState.lastDiscard} size="md" />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-10 h-14 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
              <span className="text-sm font-bold">
                {gameState.wall.length}
              </span>
            </div>
            {isPlayerTurn && !gameState.lastDraw && (
              <Button
                onClick={handleDraw}
                size="sm"
                className="h-9 text-sm px-4"
              >
                摸牌
              </Button>
            )}
          </div>
        </div>

        {/* 右侧玩家 (AI西，索引3) */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 w-14">
          <span className="text-xs truncate w-full text-center">
            {gameState.players[3].name}
            {gameState.players[3].hasHu && " OK"}
          </span>
          <OpponentTileBacks count={gameState.players[3].hand.length} variant="right" />
          <MahjongExposed melds={gameState.players[3].exposed} size="sm" />
        </div>
      </div>

      {/* 操作按钮区 - 固定在手牌上方，仅可操作时显示 */}
      {hasActionButtons && (
        <div className="shrink-0 flex flex-wrap gap-1.5 justify-center py-1">
          {isPlayerTurn && gameState.lastDraw && selectedDiscard && (
            <Button
              onClick={() => handleDiscard(selectedDiscard)}
              size="sm"
              className="h-9 text-sm px-4"
            >
              出牌
            </Button>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "pong" && (
            <>
              <Button
                onClick={handlePong}
                size="sm"
                className="h-9 text-sm px-4"
              >
                碰
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                size="sm"
                className="h-9 text-sm px-4"
              >
                过
              </Button>
            </>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "kong" && (
            <>
              <Button
                onClick={handleKong}
                size="sm"
                className="h-9 text-sm px-4"
              >
                杠
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                size="sm"
                className="h-9 text-sm px-4"
              >
                过
              </Button>
            </>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "hu" && (
            <>
              <Button
                onClick={handleHu}
                size="sm"
                className="h-9 text-sm px-4 bg-red-600 hover:bg-red-700"
              >
                胡
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                size="sm"
                className="h-9 text-sm px-4"
              >
                过
              </Button>
            </>
          )}

          {isPlayerTurn && selfKong.anKong && (
            <Button
              onClick={() => handleAnKong(selfKong.anKong!)}
              size="sm"
              className="h-9 text-sm px-3"
            >
              暗杠
            </Button>
          )}

          {isPlayerTurn && selfKong.buKong && (
            <Button
              onClick={() => handleBuKong(selfKong.buKong!)}
              size="sm"
              className="h-9 text-sm px-3"
            >
              补杠
            </Button>
          )}
        </div>
      )}

      {/* 玩家区域：碰杠牌组 + 手牌 */}
      <div className="shrink-0 flex flex-col items-center gap-1 pb-1">
        {/* 碰杠牌 - 单独排列在手牌左侧 */}
        {player.exposed.length > 0 && (
          <MahjongExposed melds={player.exposed} size="sm" />
        )}

        {/* 手牌 - 紧凑重叠排列 */}
        <CompactHand
          tiles={player.hand}
          selectedIds={selectedDiscard ? [selectedDiscard.id] : []}
          onClickTile={(tile) => {
            if (isPlayerTurn && gameState.lastDraw) {
              setSelectedDiscard((prev) => (prev?.id === tile.id ? null : tile));
            }
          }}
          lastDrawId={gameState.lastDraw?.id}
        />
      </div>

      {/* 胡牌提示弹窗 */}
      <Dialog open={showHuDialog} onOpenChange={setShowHuDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">
              可以胡牌！
            </DialogTitle>
            <DialogDescription className="text-sm">
              {huInfo?.isZimo ? "自摸胡牌" : "点炮胡牌"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-3">
            {huInfo?.tile && <MahjongTile tile={huInfo.tile} size="lg" />}
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleHu}
              className="h-12 text-base px-8 bg-red-600 hover:bg-red-700"
            >
              胡牌
            </Button>
            <Button
              variant="outline"
              onClick={handlePass}
              className="h-12 text-base px-8"
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
