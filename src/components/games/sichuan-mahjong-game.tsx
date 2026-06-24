"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useElderlyMode } from "@/lib/elderly-mode";
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
import { MahjongTile, MahjongHand, MahjongExposed, MahjongDiscard } from "./mahjong-tile";

interface SichuanMahjongGameProps {
  rules?: GameRules;
  onBack?: () => void;
}

const SUITS: Suit[] = ["wan", "tiao", "tong"];

export function SichuanMahjongGame({ rules, onBack }: SichuanMahjongGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSwapTiles, setSelectedSwapTiles] = useState<Tile[]>([]);
  const [selectedDiscard, setSelectedDiscard] = useState<Tile | null>(null);
  const [showHuDialog, setShowHuDialog] = useState(false);
  const [huInfo, setHuInfo] = useState<{ isZimo: boolean; tile: Tile } | null>(null);
  const { enabled: elderlyMode } = useElderlyMode();
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
      // AI自动定缺
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
      // 必须同花色
      if (prev.length > 0 && prev[0].suit !== tile.suit) return prev;
      return [...prev, tile];
    });
  }, []);

  const handleConfirmSwap = useCallback(() => {
    if (selectedSwapTiles.length !== 3) return;
    setGameState((prev) => {
      if (!prev) return prev;
      const after = playerSelectSwap(prev, 0, selectedSwapTiles);
      // AI也自动选
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
      <div className="flex flex-col items-center gap-6 p-4">
        <h2 className={cn("text-xl font-bold", elderlyMode && "text-3xl")}>
          换三张
        </h2>
        <p className={cn("text-muted-foreground", elderlyMode && "text-xl")}>
          请选择三张同花色的牌
        </p>
        <MahjongHand
          tiles={player.hand}
          selectedIds={selectedSwapTiles.map((t) => t.id)}
          onSelect={handleSelectSwap}
          size={elderlyMode ? "lg" : "md"}
        />
        <div className="flex gap-4">
          <Button
            onClick={handleConfirmSwap}
            disabled={selectedSwapTiles.length !== 3}
            className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
          >
            确认换牌
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedSwapTiles([])}
            className={cn("h-14 text-lg px-6", elderlyMode && "h-18 text-2xl px-8")}
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
      <div className="flex flex-col items-center gap-6 p-4">
        <h2 className={cn("text-xl font-bold", elderlyMode && "text-3xl")}>
          定缺
        </h2>
        <p className={cn("text-muted-foreground", elderlyMode && "text-xl")}>
          选择一门花色，必须打完该花色才能胡牌
        </p>
        <div className="flex gap-4">
          {SUITS.map((suit) => (
            <Button
              key={suit}
              onClick={() => handleSetLack(suit)}
              variant={player.lack === suit ? "default" : "outline"}
              className={cn(
                "h-20 w-24 text-2xl font-bold",
                elderlyMode && "h-24 w-32 text-3xl"
              )}
            >
              {getSuitShortName(suit)}
            </Button>
          ))}
        </div>
        {player.lack && (
          <p className={cn("text-lg text-primary font-semibold", elderlyMode && "text-2xl")}>
            你已选择定缺：{getSuitShortName(player.lack)}
          </p>
        )}
        <p className={cn("text-sm text-muted-foreground", elderlyMode && "text-lg")}>
          等待其他玩家定缺...
        </p>
      </div>
    );
  }

  // 游戏结束
  if (gameState.phase === "game_over") {
    return (
      <div className="flex flex-col items-center gap-6 p-4">
        <h2 className={cn("text-2xl font-bold", elderlyMode && "text-4xl")}>
          游戏结束
        </h2>
        <div className="grid grid-cols-1 gap-3 w-full max-w-md">
          {gameState.players.map((p, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                p.hasHu ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20" : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("text-lg font-bold", elderlyMode && "text-2xl")}>
                  {p.name}
                </span>
                {p.hasHu && (
                  <span className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                    {p.isZimo ? "自摸" : "胡牌"}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-xl font-bold",
                  p.score > 0 ? "text-red-600" : p.score < 0 ? "text-green-600" : "text-muted-foreground",
                  elderlyMode && "text-3xl"
                )}
              >
                {p.score > 0 ? `+${p.score}` : p.score}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
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
            className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
          >
            再来一局
          </Button>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className={cn("h-14 text-lg px-6", elderlyMode && "h-18 text-2xl px-8")}
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

  return (
    <div className="flex flex-col h-full min-h-[600px] gap-2 p-2">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-2">
        <div className={cn("text-sm text-muted-foreground", elderlyMode && "text-lg")}>
          剩余牌: {gameState.wall.length}
        </div>
        <div className={cn("text-base font-semibold", elderlyMode && "text-xl")}>
          {gameState.message}
        </div>
        <div className={cn("text-sm text-muted-foreground", elderlyMode && "text-lg")}>
          得分: {player.score > 0 ? `+${player.score}` : player.score}
        </div>
      </div>

      {/* 上方玩家 (AI南，索引2) */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn("text-xs", elderlyMode && "text-base")}>
          {gameState.players[2].name}
          {gameState.players[2].hasHu && " ✓"}
          {gameState.players[2].lack && ` [缺${getSuitShortName(gameState.players[2].lack)}]`}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: gameState.players[2].hand.length }).map((_, i) => (
            <MahjongTile key={i} faceDown size="sm" />
          ))}
        </div>
        <MahjongExposed melds={gameState.players[2].exposed} size="sm" />
      </div>

      {/* 中间区域 */}
      <div className="flex-1 flex items-center justify-center gap-4 min-h-0">
        {/* 左侧玩家 (AI东，索引1) */}
        <div className="flex flex-col items-center gap-1 w-20">
          <span className={cn("text-xs", elderlyMode && "text-base")}>
            {gameState.players[1].name}
            {gameState.players[1].hasHu && " ✓"}
          </span>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: gameState.players[1].hand.length }).map((_, i) => (
              <MahjongTile key={i} faceDown size="sm" />
            ))}
          </div>
          <MahjongExposed melds={gameState.players[1].exposed} size="sm" />
        </div>

        {/* 中央：弃牌区 + 牌山 */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <MahjongDiscard discards={gameState.discardPile} size="sm" />
            {gameState.lastDiscard && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <MahjongTile tile={gameState.lastDiscard} size="md" />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-12 h-16 rounded-lg border-2 border-border bg-muted flex items-center justify-center">
              <span className={cn("text-lg font-bold", elderlyMode && "text-2xl")}>
                {gameState.wall.length}
              </span>
            </div>
            {isPlayerTurn && !gameState.lastDraw && (
              <Button
                onClick={handleDraw}
                className={cn("h-14 text-lg px-6", elderlyMode && "h-18 text-2xl px-8")}
              >
                摸牌
              </Button>
            )}
          </div>
        </div>

        {/* 右侧玩家 (AI西，索引3) */}
        <div className="flex flex-col items-center gap-1 w-20">
          <span className={cn("text-xs", elderlyMode && "text-base")}>
            {gameState.players[3].name}
            {gameState.players[3].hasHu && " ✓"}
          </span>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: gameState.players[3].hand.length }).map((_, i) => (
              <MahjongTile key={i} faceDown size="sm" />
            ))}
          </div>
          <MahjongExposed melds={gameState.players[3].exposed} size="sm" />
        </div>
      </div>

      {/* 玩家区域 */}
      <div className="flex flex-col items-center gap-2">
        {/* 碰杠牌 */}
        {player.exposed.length > 0 && (
          <MahjongExposed melds={player.exposed} size="md" />
        )}

        {/* 手牌 */}
        <MahjongHand
          tiles={player.hand}
          selectedIds={selectedDiscard ? [selectedDiscard.id] : []}
          onClickTile={(tile) => {
            if (isPlayerTurn && gameState.lastDraw) {
              setSelectedDiscard((prev) => (prev?.id === tile.id ? null : tile));
            }
          }}
          size={elderlyMode ? "lg" : "md"}
        />

        {/* 操作按钮区 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {isPlayerTurn && gameState.lastDraw && selectedDiscard && (
            <Button
              onClick={() => handleDiscard(selectedDiscard)}
              className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
            >
              出牌
            </Button>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "pong" && (
            <>
              <Button
                onClick={handlePong}
                className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
              >
                碰
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
              >
                过
              </Button>
            </>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "kong" && (
            <>
              <Button
                onClick={handleKong}
                className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
              >
                杠
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
              >
                过
              </Button>
            </>
          )}

          {isWaitingAction && gameState.pendingAction?.type === "hu" && (
            <>
              <Button
                onClick={handleHu}
                className={cn("h-14 text-lg px-8 bg-red-600 hover:bg-red-700", elderlyMode && "h-18 text-2xl px-10")}
              >
                胡牌
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                className={cn("h-14 text-lg px-8", elderlyMode && "h-18 text-2xl px-10")}
              >
                取消
              </Button>
            </>
          )}

          {isPlayerTurn && selfKong.anKong && (
            <Button
              onClick={() => handleAnKong(selfKong.anKong!)}
              className={cn("h-14 text-lg px-6", elderlyMode && "h-18 text-2xl px-8")}
            >
              暗杠
            </Button>
          )}

          {isPlayerTurn && selfKong.buKong && (
            <Button
              onClick={() => handleBuKong(selfKong.buKong!)}
              className={cn("h-14 text-lg px-6", elderlyMode && "h-18 text-2xl px-8")}
            >
              补杠
            </Button>
          )}
        </div>
      </div>

      {/* 胡牌提示弹窗 */}
      <Dialog open={showHuDialog} onOpenChange={setShowHuDialog}>
        <DialogContent className={cn("max-w-sm", elderlyMode && "max-w-md")}>
          <DialogHeader>
            <DialogTitle className={cn("text-xl", elderlyMode && "text-3xl")}>
              可以胡牌！
            </DialogTitle>
            <DialogDescription className={cn("text-base", elderlyMode && "text-xl")}>
              {huInfo?.isZimo ? "自摸胡牌" : "点炮胡牌"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {huInfo?.tile && <MahjongTile tile={huInfo.tile} size="lg" />}
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleHu}
              className={cn("h-16 text-xl px-10 bg-red-600 hover:bg-red-700", elderlyMode && "h-20 text-2xl px-12")}
            >
              胡牌
            </Button>
            <Button
              variant="outline"
              onClick={handlePass}
              className={cn("h-16 text-xl px-10", elderlyMode && "h-20 text-2xl px-12")}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
