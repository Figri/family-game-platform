"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  type SnakeGameState,
  type GameMode,
  type Direction,
  createInitialState,
  updateGame,
  changeDirection,
  togglePause,
  getGameSpeed,
  addLeaderboardEntry,
  PLAYER1_KEYS,
  PLAYER2_KEYS,
} from "@/lib/games/snake";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface SnakeGameProps {
  mode: GameMode;
}

const CANVAS_SIZE = 400;

function getCellSize(gridSize: number): number {
  return Math.floor(CANVAS_SIZE / gridSize);
}

function drawGame(ctx: CanvasRenderingContext2D, state: SnakeGameState, elderlyMode: boolean) {
  const cellSize = getCellSize(state.gridSize);
  const actualSize = cellSize * state.gridSize;

  // Clear
  ctx.clearRect(0, 0, actualSize, actualSize);

  // Background
  ctx.fillStyle = "var(--background, #ffffff)";
  ctx.fillRect(0, 0, actualSize, actualSize);

  // Grid lines
  ctx.strokeStyle = "var(--border, #e5e7eb)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= state.gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellSize, 0);
    ctx.lineTo(i * cellSize, actualSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cellSize);
    ctx.lineTo(actualSize, i * cellSize);
    ctx.stroke();
  }

  // Food
  const food = state.food.position;
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  const fx = food.x * cellSize + cellSize / 2;
  const fy = food.y * cellSize + cellSize / 2;
  const fr = cellSize * 0.35;
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.fill();

  // Snakes
  const snakeColors = ["#22c55e", "#3b82f6"];
  const snakeHeadColors = ["#16a34a", "#2563eb"];

  state.snakes.forEach((snake, si) => {
    if (!snake.alive && snake.body.length === 0) return;
    const color = snakeColors[si % snakeColors.length];
    const headColor = snakeHeadColors[si % snakeHeadColors.length];

    snake.body.forEach((seg, i) => {
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;
      const padding = elderlyMode ? 1 : 1;
      const size = cellSize - padding * 2;

      ctx.fillStyle = i === 0 ? headColor : color;
      ctx.fillRect(x + padding, y + padding, size, size);

      // Eyes on head
      if (i === 0 && snake.alive) {
        ctx.fillStyle = "#ffffff";
        const eyeSize = Math.max(2, cellSize * 0.15);
        const eyeOffset = cellSize * 0.25;
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.arc(x + cellSize - eyeOffset, y + eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });
}

export function SnakeGame({ mode }: SnakeGameProps) {
  const elderlyMode = false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeGameState>(createInitialState(mode));
  const [renderTick, setRenderTick] = useState(0);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStateRef = useRef<SnakeGameState | null>(null);

  const forceRender = useCallback(() => {
    setRenderTick((t) => t + 1);
  }, []);

  const startGameLoop = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    const tick = () => {
      const state = stateRef.current;
      if (state.status !== "running") return;
      const newState = updateGame(state);
      stateRef.current = newState;
      forceRender();

      // Check game over and save score
      if (newState.status === "over" && lastStateRef.current?.status !== "over") {
        if (mode === "single") {
          const score = newState.snakes[0]?.score ?? 0;
          addLeaderboardEntry({
            score,
            date: new Date().toISOString(),
            mode: "single",
          });
        } else {
          // For duo, save both scores
          newState.snakes.forEach((snake, idx) => {
            addLeaderboardEntry({
              score: snake.score,
              date: new Date().toISOString(),
              mode: "duo",
            });
          });
        }
      }
      lastStateRef.current = newState;

      // Restart loop with new speed
      if (newState.status === "running") {
        const speed = getGameSpeed(newState);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        gameLoopRef.current = setInterval(tick, speed);
      }
    };

    const speed = getGameSpeed(stateRef.current);
    gameLoopRef.current = setInterval(tick, speed);
  }, [forceRender, mode]);

  const stopGameLoop = useCallback(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
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
    // Auto start after a short delay
    setTimeout(() => {
      const started = togglePause(stateRef.current);
      stateRef.current = started;
      forceRender();
      startGameLoop();
    }, 300);
  }, [forceRender, mode, startGameLoop, stopGameLoop]);

  const handleDirection = useCallback(
    (snakeIndex: number, direction: Direction) => {
      const state = stateRef.current;
      if (state.status !== "running") return;
      const newState = changeDirection(state, snakeIndex, direction);
      stateRef.current = newState;
      forceRender();
    },
    [forceRender]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key === " " || key === "Enter") {
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
        const dir = PLAYER1_KEYS[key];
        if (dir) {
          e.preventDefault();
          handleDirection(0, dir);
        }
      } else {
        const dir1 = PLAYER1_KEYS[key];
        if (dir1) {
          e.preventDefault();
          handleDirection(0, dir1);
        }
        const dir2 = PLAYER2_KEYS[key];
        if (dir2) {
          e.preventDefault();
          handleDirection(1, dir2);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDirection, handlePause, handleRestart, mode]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGame(ctx, stateRef.current, elderlyMode);
  }, [renderTick, elderlyMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGameLoop();
    };
  }, [stopGameLoop]);

  const state = stateRef.current;
  const cellSize = getCellSize(state.gridSize);
  const actualSize = cellSize * state.gridSize;

  const isGameOver = state.status === "over";
  const isPaused = state.status === "paused";
  const isIdle = state.status === "idle";

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Score Board */}
      <div className="flex items-center justify-between w-full px-2">
        {mode === "single" ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground elderly-mode:text-2xl">
              得分: {state.snakes[0]?.score ?? 0}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-green-600 elderly-mode:text-2xl">
              玩家1: {state.snakes[0]?.score ?? 0}
            </span>
            <span className="text-lg font-bold text-blue-600 elderly-mode:text-2xl">
              玩家2: {state.snakes[1]?.score ?? 0}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isPaused && (
            <span className="text-sm text-amber-600 font-semibold elderly-mode:text-lg">
              已暂停
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border-2 border-border rounded-lg overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          width={actualSize}
          height={actualSize}
          className="block"
          style={{
            width: actualSize,
            maxWidth: "100%",
            height: "auto",
          }}
        />

        {/* Overlay for idle / paused / game over */}
        {(isIdle || isPaused || isGameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-4">
            {isIdle && (
              <>
                <p className="text-white text-2xl font-bold elderly-mode:text-3xl">
                  准备开始
                </p>
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
                <p className="text-white text-2xl font-bold elderly-mode:text-3xl">
                  游戏暂停
                </p>
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
                <p className="text-white text-2xl font-bold elderly-mode:text-3xl">
                  游戏结束
                </p>
                {mode === "duo" && (
                  <p className="text-white text-xl font-semibold elderly-mode:text-2xl">
                    {state.winner === 0
                      ? "玩家1 获胜！"
                      : state.winner === 1
                      ? "玩家2 获胜！"
                      : "平局！"}
                  </p>
                )}
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
                    onClick={() => { window.location.href = "/family-game-platform/game/snake/menu"; }}
                    className={cn(
                      "h-14 px-6 text-xl font-semibold bg-white/90",
                      "elderly-mode:h-16 elderly-mode:text-2xl"
                    )}
                  >
                    返回菜单
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
      <div className="flex flex-col items-center gap-2 w-full">
        {mode === "single" ? (
          <div className="grid grid-cols-3 gap-2 max-w-[240px]">
            <div />
            <TouchButton
              onClick={() => handleDirection(0, "UP")}
              label="上"
              elderlyMode={elderlyMode}
            />
            <div />
            <TouchButton
              onClick={() => handleDirection(0, "LEFT")}
              label="左"
              elderlyMode={elderlyMode}
            />
            <TouchButton
              onClick={() => handleDirection(0, "DOWN")}
              label="下"
              elderlyMode={elderlyMode}
            />
            <TouchButton
              onClick={() => handleDirection(0, "RIGHT")}
              label="右"
              elderlyMode={elderlyMode}
            />
          </div>
        ) : (
          <div className="flex justify-between w-full max-w-md gap-4">
            {/* Player 1 Controls */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-green-600 elderly-mode:text-lg">
                玩家1
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <TouchButton
                  onClick={() => handleDirection(0, "UP")}
                  label="上"
                  elderlyMode={elderlyMode}
                  color="green"
                />
                <div />
                <TouchButton
                  onClick={() => handleDirection(0, "LEFT")}
                  label="左"
                  elderlyMode={elderlyMode}
                  color="green"
                />
                <TouchButton
                  onClick={() => handleDirection(0, "DOWN")}
                  label="下"
                  elderlyMode={elderlyMode}
                  color="green"
                />
                <TouchButton
                  onClick={() => handleDirection(0, "RIGHT")}
                  label="右"
                  elderlyMode={elderlyMode}
                  color="green"
                />
              </div>
            </div>

            {/* Player 2 Controls */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-blue-600 elderly-mode:text-lg">
                玩家2
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div />
                <TouchButton
                  onClick={() => handleDirection(1, "UP")}
                  label="上"
                  elderlyMode={elderlyMode}
                  color="blue"
                />
                <div />
                <TouchButton
                  onClick={() => handleDirection(1, "LEFT")}
                  label="左"
                  elderlyMode={elderlyMode}
                  color="blue"
                />
                <TouchButton
                  onClick={() => handleDirection(1, "DOWN")}
                  label="下"
                  elderlyMode={elderlyMode}
                  color="blue"
                />
                <TouchButton
                  onClick={() => handleDirection(1, "RIGHT")}
                  label="右"
                  elderlyMode={elderlyMode}
                  color="blue"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-muted-foreground elderly-mode:text-base px-2">
        {mode === "single" ? (
          <p>方向键或 WASD 控制方向，空格键暂停</p>
        ) : (
          <p>
            玩家1: 方向键/WASD | 玩家2: IJKL | 空格键暂停
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
}: {
  onClick: () => void;
  label: string;
  elderlyMode: boolean;
  color?: "default" | "green" | "blue";
}) {
  const colorClasses = {
    default: "bg-muted hover:bg-muted/80 text-foreground",
    green: "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-100",
    blue: "bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg font-semibold select-none active:scale-95 transition-transform",
        colorClasses[color],
        elderlyMode ? "w-20 h-20 text-2xl" : "w-16 h-16 text-xl"
      )}
      style={{ minWidth: 64, minHeight: 64 }}
      aria-label={label}
    >
      {label}
    </button>
  );
}
