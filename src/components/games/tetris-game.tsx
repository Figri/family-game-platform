"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  type TetrisGameState,
  type GameMode,
  type PlayerState,
  type Tetromino,
  createInitialState,
  movePiece,
  rotatePiece,
  hardDrop,
  togglePause,
  getDropInterval,
  getGhostPosition,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  PLAYER1_KEYS,
  PLAYER2_KEYS,
} from "@/lib/games/tetris";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface TetrisGameProps {
  mode: GameMode;
}

const CELL_SIZE = 24;
const PREVIEW_CELL_SIZE = 20;

function drawBoard(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  elderlyMode: boolean
) {
  const cell = elderlyMode ? Math.floor(CELL_SIZE * 1.2) : CELL_SIZE;
  const width = cell * BOARD_WIDTH;
  const height = cell * BOARD_HEIGHT;

  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "var(--background, #ffffff)";
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = "var(--border, #e5e7eb)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= BOARD_WIDTH; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, height);
    ctx.stroke();
  }
  for (let i = 0; i <= BOARD_HEIGHT; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(width, i * cell);
    ctx.stroke();
  }

  // Draw locked cells
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const color = player.board[y][x];
      if (color) {
        drawCell(ctx, x, y, color, cell, true);
      }
    }
  }

  // Draw ghost piece
  const ghost = getGhostPosition(player.board, player.currentPiece);
  drawPiece(ctx, player.currentPiece, ghost.x, ghost.y, cell, true);

  // Draw current piece
  drawPiece(ctx, player.currentPiece, player.currentPiece.position.x, player.currentPiece.position.y, cell, false);
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  cellSize: number,
  isGhost: boolean
) {
  const px = x * cellSize;
  const py = y * cellSize;
  const padding = 1;
  const size = cellSize - padding * 2;

  if (isGhost) {
    ctx.globalAlpha = 0.3;
  }

  ctx.fillStyle = color;
  ctx.fillRect(px + padding, py + padding, size, size);

  // Bevel effect
  ctx.globalAlpha = isGhost ? 0.15 : 0.3;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px + padding, py + padding, size, 2);
  ctx.fillRect(px + padding, py + padding, 2, size);

  ctx.globalAlpha = isGhost ? 0.15 : 0.2;
  ctx.fillStyle = "#000000";
  ctx.fillRect(px + padding, py + size - 2 + padding, size, 2);
  ctx.fillRect(px + size - 2 + padding, py + padding, 2, size);

  ctx.globalAlpha = 1;
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Tetromino,
  offsetX: number,
  offsetY: number,
  cellSize: number,
  isGhost: boolean
) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardX = offsetX + x;
        const boardY = offsetY + y;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          drawCell(ctx, boardX, boardY, piece.color, cellSize, isGhost);
        }
      }
    }
  }
}

function drawNextPiece(
  ctx: CanvasRenderingContext2D,
  pieceType: string,
  elderlyMode: boolean
) {
  const cell = elderlyMode ? Math.floor(PREVIEW_CELL_SIZE * 1.2) : PREVIEW_CELL_SIZE;
  const shape = TETROMINO_SHAPES[pieceType as keyof typeof TETROMINO_SHAPES][0];
  const color = TETROMINO_COLORS[pieceType as keyof typeof TETROMINO_COLORS];
  const width = cell * 4;
  const height = cell * 4;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "var(--background, #ffffff)";
  ctx.fillRect(0, 0, width, height);

  const offsetX = Math.floor((4 - shape[0].length) / 2);
  const offsetY = Math.floor((4 - shape.length) / 2);

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        drawCell(ctx, offsetX + x, offsetY + y, color, cell, false);
      }
    }
  }
}

function PlayerBoard({
  player,
  playerIndex,
  isDuo,
  elderlyMode,
}: {
  player: PlayerState;
  playerIndex: number;
  isDuo: boolean;
  elderlyMode: boolean;
}) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const boardCanvas = boardRef.current;
    const nextCanvas = nextRef.current;
    if (!boardCanvas || !nextCanvas) return;

    const boardCtx = boardCanvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");
    if (!boardCtx || !nextCtx) return;

    drawBoard(boardCtx, player, elderlyMode);
    drawNextPiece(nextCtx, player.nextPiece, elderlyMode);
  }, [player, elderlyMode]);

  const cell = elderlyMode ? Math.floor(CELL_SIZE * 1.2) : CELL_SIZE;
  const previewCell = elderlyMode ? Math.floor(PREVIEW_CELL_SIZE * 1.2) : PREVIEW_CELL_SIZE;
  const boardWidth = cell * BOARD_WIDTH;
  const boardHeight = cell * BOARD_HEIGHT;
  const previewSize = previewCell * 4;

  const playerColors = ["text-cyan-600", "text-orange-600"];
  const playerLabels = ["玩家1", "玩家2"];

  return (
    <div className="flex flex-col items-center gap-2">
      {isDuo && (
        <span className={cn("text-lg font-bold", playerColors[playerIndex], "elderly-mode:text-2xl")}>
          {playerLabels[playerIndex]}
        </span>
      )}

      <div className="flex gap-3">
        {/* Main board */}
        <div className="relative border-2 border-border rounded-lg overflow-hidden bg-background">
          <canvas
            ref={boardRef}
            width={boardWidth}
            height={boardHeight}
            className="block"
            style={{ width: boardWidth, height: boardHeight }}
          />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3">
          {/* Next piece */}
          <div className="border-2 border-border rounded-lg overflow-hidden bg-background p-2">
            <p className="text-xs font-semibold text-muted-foreground text-center mb-1 elderly-mode:text-base">
              下一个
            </p>
            <canvas
              ref={nextRef}
              width={previewSize}
              height={previewSize}
              className="block"
              style={{ width: previewSize, height: previewSize }}
            />
          </div>

          {/* Stats */}
          <div className="border-2 border-border rounded-lg p-3 bg-background flex flex-col gap-2 min-w-[100px]">
            <div>
              <p className="text-xs text-muted-foreground elderly-mode:text-base">分数</p>
              <p className="text-lg font-bold elderly-mode:text-2xl">{player.score}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground elderly-mode:text-base">等级</p>
              <p className="text-lg font-bold elderly-mode:text-2xl">{player.level}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground elderly-mode:text-base">消行</p>
              <p className="text-lg font-bold elderly-mode:text-2xl">{player.lines}</p>
            </div>
            {isDuo && player.garbageQueue > 0 && (
              <div>
                <p className="text-xs text-red-500 elderly-mode:text-base">待接收垃圾</p>
                <p className="text-lg font-bold text-red-500 elderly-mode:text-2xl">{player.garbageQueue}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TetrisGame({ mode }: TetrisGameProps) {
  const elderlyMode = false;
  const stateRef = useRef<TetrisGameState>(createInitialState(mode));
  const [renderTick, setRenderTick] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const lastDropRef = useRef<number>(0);
  const lastStateRef = useRef<TetrisGameState | null>(null);

  const forceRender = useCallback(() => {
    setRenderTick((t) => t + 1);
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    const state = stateRef.current;
    if (state.status !== "running") {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const dropInterval = getDropInterval(state.players[0]?.level || 1);

    // Auto drop for each player
    state.players.forEach((player, idx) => {
      if (player.gameOver) return;
      const playerDropInterval = getDropInterval(player.level);
      const lastDrop = lastDropRef.current || timestamp;
      if (timestamp - lastDrop >= playerDropInterval) {
        const newState = movePiece(stateRef.current, idx, 0, 1);
        stateRef.current = newState;
        lastDropRef.current = timestamp;
      }
    });

    forceRender();
    lastStateRef.current = stateRef.current;
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [forceRender]);

  const startGameLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    lastDropRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const stopGameLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const handleStart = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "idle" || state.status === "paused") {
      const newState = togglePause(state);
      stateRef.current = newState;
      forceRender();
      if (newState.status === "running") {
        startGameLoop();
      }
    }
  }, [forceRender, startGameLoop]);

  const handlePause = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "running") {
      const newState = togglePause(state);
      stateRef.current = newState;
      stopGameLoop();
      forceRender();
    } else if (state.status === "paused") {
      const newState = togglePause(state);
      stateRef.current = newState;
      forceRender();
      startGameLoop();
    }
  }, [forceRender, startGameLoop, stopGameLoop]);

  const handleRestart = useCallback(() => {
    stopGameLoop();
    const newState = createInitialState(mode);
    stateRef.current = newState;
    lastStateRef.current = null;
    forceRender();
    setTimeout(() => {
      const started = togglePause(stateRef.current);
      stateRef.current = started;
      forceRender();
      startGameLoop();
    }, 300);
  }, [forceRender, mode, startGameLoop, stopGameLoop]);

  const handleAction = useCallback(
    (playerIndex: number, action: string) => {
      const state = stateRef.current;
      if (state.status !== "running") return;

      let newState = state;
      switch (action) {
        case "left":
          newState = movePiece(state, playerIndex, -1, 0);
          break;
        case "right":
          newState = movePiece(state, playerIndex, 1, 0);
          break;
        case "down":
          newState = movePiece(state, playerIndex, 0, 1);
          break;
        case "rotate":
          newState = rotatePiece(state, playerIndex, true);
          break;
        case "hardDrop":
          newState = hardDrop(state, playerIndex);
          break;
      }
      stateRef.current = newState;
      forceRender();
    },
    [forceRender]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === "Enter") {
        e.preventDefault();
        const state = stateRef.current;
        if (state.status === "idle" || state.status === "over") {
          handleRestart();
        } else {
          handlePause();
        }
        return;
      }

      if (mode === "single") {
        const action = PLAYER1_KEYS[key];
        if (action) {
          e.preventDefault();
          handleAction(0, action);
        }
      } else {
        const action1 = PLAYER1_KEYS[key];
        if (action1) {
          e.preventDefault();
          handleAction(0, action1);
        }
        const action2 = PLAYER2_KEYS[key];
        if (action2) {
          e.preventDefault();
          handleAction(1, action2);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction, handlePause, handleRestart, mode]);

  // Start game loop on mount if running
  useEffect(() => {
    if (stateRef.current.status === "running") {
      startGameLoop();
    }
    return () => {
      stopGameLoop();
    };
  }, [startGameLoop, stopGameLoop]);

  const state = stateRef.current;
  const isGameOver = state.status === "over";
  const isPaused = state.status === "paused";
  const isIdle = state.status === "idle";

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
      {/* Boards */}
      <div className={cn(
        "flex gap-4 justify-center",
        mode === "duo" ? "flex-col sm:flex-row" : "flex-col items-center"
      )}>
        {state.players.map((player, idx) => (
          <div key={idx} className="relative">
            <PlayerBoard
              player={player}
              playerIndex={idx}
              isDuo={mode === "duo"}
              elderlyMode={elderlyMode}
            />
            {/* Game over overlay per player in duo */}
            {mode === "duo" && player.gameOver && state.status !== "over" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <p className="text-white text-xl font-bold elderly-mode:text-2xl">已出局</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global overlay for idle / paused / game over */}
      {(isIdle || isPaused || isGameOver) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background border-2 border-border rounded-xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            {isIdle && (
              <>
                <p className="text-2xl font-bold elderly-mode:text-3xl">准备开始</p>
                <Button
                  onClick={handleStart}
                  className={cn(
                    "h-14 px-8 text-xl font-semibold",
                    "elderly-mode:h-16 elderly-mode:text-2xl"
                  )}
                >
                  开始游戏
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <p className="text-2xl font-bold elderly-mode:text-3xl">游戏暂停</p>
                <Button
                  onClick={handlePause}
                  className={cn(
                    "h-14 px-8 text-xl font-semibold",
                    "elderly-mode:h-16 elderly-mode:text-2xl"
                  )}
                >
                  继续游戏
                </Button>
              </>
            )}
            {isGameOver && (
              <>
                <p className="text-2xl font-bold elderly-mode:text-3xl">游戏结束</p>
                {mode === "duo" && (
                  <p className="text-xl font-semibold elderly-mode:text-2xl">
                    {state.winner === 0
                      ? "玩家1 获胜！"
                      : state.winner === 1
                      ? "玩家2 获胜！"
                      : "平局！"}
                  </p>
                )}
                <div className="flex flex-col gap-2 w-full">
                  {state.players.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-lg elderly-mode:text-xl">
                      <span>{mode === "duo" ? `玩家${idx + 1}` : "得分"}</span>
                      <span className="font-bold">{p.score}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleRestart}
                    className={cn(
                      "h-14 px-6 text-xl font-semibold",
                      "elderly-mode:h-16 elderly-mode:text-2xl"
                    )}
                  >
                    重新开始
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { window.location.href = "/family-game-platform/game/tetris/menu"; }}
                    className={cn(
                      "h-14 px-6 text-xl font-semibold",
                      "elderly-mode:h-16 elderly-mode:text-2xl"
                    )}
                  >
                    返回菜单
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-3 w-full justify-center">
        <Button
          onClick={handlePause}
          disabled={isIdle || isGameOver}
          className={cn(
            "h-14 px-5 text-lg font-semibold min-w-[80px]",
            "elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          {isPaused ? "继续" : "暂停"}
        </Button>
        <Button
          onClick={handleRestart}
          variant="outline"
          className={cn(
            "h-14 px-5 text-lg font-semibold min-w-[80px]",
            "elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          重新开始
        </Button>
      </div>

      {/* Touch Controls */}
      <div className="flex flex-col items-center gap-4 w-full">
        {mode === "single" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="grid grid-cols-3 gap-2">
              <div />
              <TouchButton
                onClick={() => handleAction(0, "rotate")}
                label="旋转"
                elderlyMode={elderlyMode}
              />
              <div />
              <TouchButton
                onClick={() => handleAction(0, "left")}
                label="左"
                elderlyMode={elderlyMode}
              />
              <TouchButton
                onClick={() => handleAction(0, "down")}
                label="下"
                elderlyMode={elderlyMode}
              />
              <TouchButton
                onClick={() => handleAction(0, "right")}
                label="右"
                elderlyMode={elderlyMode}
              />
            </div>
            <TouchButton
              onClick={() => handleAction(0, "hardDrop")}
              label="硬降"
              elderlyMode={elderlyMode}
              variant="primary"
            />
          </div>
        ) : (
          <div className="flex justify-between w-full max-w-lg gap-4">
            {/* Player 1 Controls */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-cyan-600 elderly-mode:text-lg">
                玩家1
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <TouchButton
                  onClick={() => handleAction(0, "rotate")}
                  label="旋转"
                  elderlyMode={elderlyMode}
                  color="cyan"
                />
                <div />
                <TouchButton
                  onClick={() => handleAction(0, "left")}
                  label="左"
                  elderlyMode={elderlyMode}
                  color="cyan"
                />
                <TouchButton
                  onClick={() => handleAction(0, "down")}
                  label="下"
                  elderlyMode={elderlyMode}
                  color="cyan"
                />
                <TouchButton
                  onClick={() => handleAction(0, "right")}
                  label="右"
                  elderlyMode={elderlyMode}
                  color="cyan"
                />
              </div>
              <TouchButton
                onClick={() => handleAction(0, "hardDrop")}
                label="硬降"
                elderlyMode={elderlyMode}
                color="cyan"
              />
            </div>

            {/* Player 2 Controls */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-orange-600 elderly-mode:text-lg">
                玩家2
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <TouchButton
                  onClick={() => handleAction(1, "rotate")}
                  label="旋转"
                  elderlyMode={elderlyMode}
                  color="orange"
                />
                <div />
                <TouchButton
                  onClick={() => handleAction(1, "left")}
                  label="左"
                  elderlyMode={elderlyMode}
                  color="orange"
                />
                <TouchButton
                  onClick={() => handleAction(1, "down")}
                  label="下"
                  elderlyMode={elderlyMode}
                  color="orange"
                />
                <TouchButton
                  onClick={() => handleAction(1, "right")}
                  label="右"
                  elderlyMode={elderlyMode}
                  color="orange"
                />
              </div>
              <TouchButton
                onClick={() => handleAction(1, "hardDrop")}
                label="硬降"
                elderlyMode={elderlyMode}
                color="orange"
              />
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground elderly-mode:text-base px-2">
        {mode === "single" ? (
          <p>方向键/WASD 移动，上/W 旋转，空格 硬降，回车 暂停</p>
        ) : (
          <p>
            玩家1: 方向键/WASD | 玩家2: IJKL/M | 回车 暂停
          </p>
        )}
      </div>
    </div>
  );
}

function TouchButton({
  onClick,
  label,
  elderlyMode,
  color = "default",
  variant = "default",
}: {
  onClick: () => void;
  label: string;
  elderlyMode: boolean;
  color?: "default" | "cyan" | "orange";
  variant?: "default" | "primary";
}) {
  const colorClasses = {
    default: "bg-muted hover:bg-muted/80 text-foreground",
    cyan: "bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-900 dark:hover:bg-cyan-800 dark:text-cyan-100",
    orange: "bg-orange-100 hover:bg-orange-200 text-orange-800 dark:bg-orange-900 dark:hover:bg-orange-800 dark:text-orange-100",
  };

  const primaryClasses =
    "bg-primary hover:bg-primary/90 text-primary-foreground";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg font-semibold select-none active:scale-95 transition-transform",
        variant === "primary" ? primaryClasses : colorClasses[color],
        elderlyMode ? "w-20 h-20 text-2xl" : "w-16 h-16 text-xl"
      )}
      style={{ minWidth: 64, minHeight: 64 }}
      aria-label={label}
    >
      {label}
    </button>
  );
}
