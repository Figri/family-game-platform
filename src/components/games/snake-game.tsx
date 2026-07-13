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

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: SnakeGameState,
  cellSize: number,
  elderlyMode: boolean
) {
  const actualSize = cellSize * state.gridSize;

  ctx.clearRect(0, 0, actualSize, actualSize);

  ctx.fillStyle = "#F6F1E7";
  ctx.fillRect(0, 0, actualSize, actualSize);

  ctx.strokeStyle = "rgba(0,0,0,0.06)";
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

  const food = state.food.position;
  ctx.fillStyle = "#F05A47";
  ctx.beginPath();
  const fx = food.x * cellSize + cellSize / 2;
  const fy = food.y * cellSize + cellSize / 2;
  const fr = cellSize * 0.35;
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.fill();

  const snakeColors = ["#56C271", "#3b82f6"];
  const snakeHeadColors = ["#176B3A", "#2563eb"];

  state.snakes.forEach((snake, si) => {
    if (!snake.alive && snake.body.length === 0) return;
    const color = snakeColors[si % snakeColors.length];
    const headColor = snakeHeadColors[si % snakeHeadColors.length];

    snake.body.forEach((seg, i) => {
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;
      const padding = 1;
      const size = cellSize - padding * 2;

      ctx.fillStyle = i === 0 ? headColor : color;
      ctx.fillRect(x + padding, y + padding, size, size);

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
        elderlyMode ? "w-20 h-20 text-2xl" : "w-14 h-14 text-lg"
      )}
      style={{ minWidth: 56, minHeight: 48, touchAction: "manipulation" }}
      aria-label={label}
    >
      {label}
    </button>
  );
}

interface SnakeGameProps {
  mode: GameMode;
}

export function SnakeGame({ mode }: SnakeGameProps) {
  const elderlyMode = false;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SnakeGameState>(createInitialState(mode));
  const [renderTick, setRenderTick] = useState(0);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStateRef = useRef<SnakeGameState | null>(null);
  const [cellSize, setCellSize] = useState(20);

  // Dynamic cell size based on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalc = () => {
      const state = stateRef.current;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const cell = Math.max(8, Math.floor(Math.min(w, h) / state.gridSize));
      setCellSize(cell);
    };

    recalc();

    const observer = new ResizeObserver(() => {
      recalc();
    });
    observer.observe(container);
    window.addEventListener("resize", recalc);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

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

      if (newState.status === "over" && lastStateRef.current?.status !== "over") {
        if (mode === "single") {
          const score = newState.snakes[0]?.score ?? 0;
          addLeaderboardEntry({
            score,
            date: new Date().toISOString(),
            mode: "single",
          });
        } else {
          newState.snakes.forEach((snake) => {
            addLeaderboardEntry({
              score: snake.score,
              date: new Date().toISOString(),
              mode: "duo",
            });
          });
        }
      }
      lastStateRef.current = newState;

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
    const state = stateRef.current;
    const size = cellSize * state.gridSize;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    drawGame(ctx, state, cellSize, elderlyMode);
  }, [renderTick, cellSize, elderlyMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGameLoop();
    };
  }, [stopGameLoop]);

  const state = stateRef.current;
  const actualSize = cellSize * state.gridSize;

  const isGameOver = state.status === "over";
  const isPaused = state.status === "paused";
  const isIdle = state.status === "idle";

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top: Score - compact */}
      <div
        className="shrink-0 flex items-center justify-between px-3 bg-[#FFF9F0]"
        style={{ height: "44px" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => { window.location.href = "/family-game-platform/game/snake/select"; }}
            className="text-lg font-semibold text-[#8B7355] hover:text-foreground transition-colors"
            style={{ touchAction: "manipulation" }}
            aria-label="返回"
          >
            &larr;
          </button>
          <span className="text-base font-bold">贪吃蛇</span>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          {mode === "single" ? (
            <span>
              得分: <span className="text-[#F97316]">{state.snakes[0]?.score ?? 0}</span>
            </span>
          ) : (
            <>
              <span className="text-green-600">
                P1: {state.snakes[0]?.score ?? 0}
              </span>
              <span className="text-blue-600">
                P2: {state.snakes[1]?.score ?? 0}
              </span>
            </>
          )}
          {isPaused && (
            <span className="text-amber-600">已暂停</span>
          )}
        </div>
      </div>

      {/* Middle: Canvas - fills remaining space */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        ref={containerRef}
      >
        <div className="relative border-2 border-border rounded-lg overflow-hidden" style={{ background: "#F6F1E7" }}>
          <canvas
            ref={canvasRef}
            className="block"
          />

          {/* Overlay for idle / paused / game over */}
          {(isIdle || isPaused || isGameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-4">
              {isIdle && (
                <>
                  <p className="text-white text-2xl font-bold">
                    准备开始
                  </p>
                  <Button
                    onClick={handleStart}
                    className="h-14 px-8 text-xl font-semibold"
                  >
                    开始游戏
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <p className="text-white text-2xl font-bold">
                    游戏暂停
                  </p>
                  <Button
                    onClick={handlePause}
                    className="h-14 px-8 text-xl font-semibold"
                  >
                    继续游戏
                  </Button>
                </>
              )}
              {isGameOver && (
                <>
                  <p className="text-white text-2xl font-bold">
                    游戏结束
                  </p>
                  {mode === "duo" && (
                    <p className="text-white text-xl font-semibold">
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
                      className="h-14 px-6 text-xl font-semibold"
                    >
                      重新开始
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { window.location.href = "/family-game-platform/game/snake/menu"; }}
                      className="h-14 px-6 text-xl font-semibold bg-white/90"
                    >
                      返回菜单
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Controls - compact */}
      <div
        className="shrink-0 flex flex-col items-center gap-[6px] px-3 pb-2 pt-1 bg-[#FFF9F0] overflow-hidden"
        style={{ touchAction: "manipulation" }}
      >
        {/* Pause / Restart row */}
        <div className="flex gap-2 w-full max-w-[400px]">
          <button
            onClick={handlePause}
            disabled={isIdle || isGameOver}
            className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] disabled:opacity-50 transition-colors select-none"
            style={{ touchAction: "manipulation" }}
          >
            {isPaused ? "继续" : "暂停"}
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] transition-colors select-none"
            style={{ touchAction: "manipulation" }}
          >
            重新开始
          </button>
        </div>

        {/* Direction controls */}
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
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-green-600">玩家1</span>
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
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-semibold text-blue-600">玩家2</span>
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
    </div>
  );
}
