"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
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
import { GameResultModal } from "@/components/game-result-modal";

/* ------------------------------------------------------------------ */
/*  Canvas drawing helpers                                             */
/* ------------------------------------------------------------------ */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  cellSize: number
) {
  const cell = cellSize;
  const width = cell * BOARD_WIDTH;
  const height = cell * BOARD_HEIGHT;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e5e7eb";
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

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const color = player.board[y][x];
      if (color) {
        drawCell(ctx, x, y, color, cell, false);
      }
    }
  }

  const ghost = getGhostPosition(player.board, player.currentPiece);
  drawPiece(ctx, player.currentPiece, ghost.x, ghost.y, cell, true);

  drawPiece(
    ctx,
    player.currentPiece,
    player.currentPiece.position.x,
    player.currentPiece.position.y,
    cell,
    false
  );
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

  if (isGhost) ctx.globalAlpha = 0.3;

  ctx.fillStyle = color;
  ctx.fillRect(px + padding, py + padding, size, size);

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
        if (
          boardY >= 0 &&
          boardY < BOARD_HEIGHT &&
          boardX >= 0 &&
          boardX < BOARD_WIDTH
        ) {
          drawCell(ctx, boardX, boardY, piece.color, cellSize, isGhost);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Long-press control button                                          */
/* ------------------------------------------------------------------ */
function ControlButton({
  label,
  onAction,
  repeatable = false,
  colorClass = "bg-[#E8E0D6] hover:bg-[#DDD5CB] text-foreground",
  fullWidth = false,
}: {
  label: string;
  onAction: () => void;
  repeatable?: boolean;
  colorClass?: string;
  fullWidth?: boolean;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);

  const start = useCallback(() => {
    if (pressedRef.current) return;
    pressedRef.current = true;

    onAction();

    if (!repeatable) return;

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        onAction();
      }, 80);
    }, 200);
  }, [onAction, repeatable]);

  const stop = useCallback(() => {
    pressedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        start();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stop();
      }}
      onTouchCancel={stop}
      onMouseDown={(e) => {
        e.preventDefault();
        start();
      }}
      onMouseUp={stop}
      onMouseLeave={stop}
      className={cn(
        "flex items-center justify-center rounded-xl font-semibold select-none",
        "active:scale-95 transition-transform duration-75",
        "text-[18px] leading-tight",
        "min-h-[48px] min-w-[48px] px-3",
        fullWidth && "w-full",
        colorClass
      )}
      style={{ touchAction: "manipulation" }}
      aria-label={label}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Detect mobile (no keyboard)                                        */
/* ------------------------------------------------------------------ */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setMobile(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          window.innerWidth < 768
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ------------------------------------------------------------------ */
/*  Main TetrisGame component                                          */
/* ------------------------------------------------------------------ */
interface TetrisGameProps {
  mode: GameMode;
}

export function TetrisGame({ mode }: TetrisGameProps) {
  const isMobile = useIsMobile();
  const stateRef = useRef<TetrisGameState>(createInitialState(mode));
  const [renderTick, setRenderTick] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const lastDropRef = useRef<number>(0);
  const lastStateRef = useRef<TetrisGameState | null>(null);

  /* Canvas refs */
  const boardCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(24);

  /* Dynamic cell-size calculation */
  const recalcCellSize = useCallback(() => {
    const container = boardContainerRef.current;
    if (!container) return;
    const availH = container.clientHeight;
    const availW = container.clientWidth;
    const cellFromH = Math.floor(availH / BOARD_HEIGHT);
    const cellFromW = Math.floor(availW / BOARD_WIDTH);
    const cell = Math.max(8, Math.min(cellFromH, cellFromW));
    setCellSize(cell);
  }, []);

  useEffect(() => {
    // Use ResizeObserver for more reliable container size detection
    const container = boardContainerRef.current;
    if (!container) return;

    recalcCellSize();

    const observer = new ResizeObserver(() => {
      recalcCellSize();
    });
    observer.observe(container);
    window.addEventListener("resize", recalcCellSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalcCellSize);
    };
  }, [recalcCellSize]);

  /* Redraw canvas whenever state or cellSize changes */
  useEffect(() => {
    const state = stateRef.current;
    const canvas = boardCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const player = state.players[0];

    const bw = cellSize * BOARD_WIDTH;
    const bh = cellSize * BOARD_HEIGHT;
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = `${bw}px`;
    canvas.style.height = `${bh}px`;

    drawBoard(ctx, player, cellSize);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderTick, cellSize]);

  /* ---- Game loop ---- */
  const forceRender = useCallback(() => {
    setRenderTick((t) => t + 1);
  }, []);

  const gameLoop = useCallback(
    (timestamp: number) => {
      const state = stateRef.current;
      if (state.status !== "running") {
        animFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

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
    },
    [forceRender]
  );

  const startGameLoop = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
      if (newState.status === "running") startGameLoop();
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

  /* Keyboard controls */
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

  /* Start game loop on mount */
  useEffect(() => {
    if (stateRef.current.status === "running") startGameLoop();
    return () => stopGameLoop();
  }, [startGameLoop, stopGameLoop]);

  /* ---- Derived state ---- */
  const state = stateRef.current;
  const isGameOver = state.status === "over";
  const isPaused = state.status === "paused";
  const isIdle = state.status === "idle";
  const player = state.players[0];

  /* ---- Render: Portrait-first layout ---- */
  return (
    <>
      {/* Portrait layout (default, shown on all screen sizes) */}
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
        {/* Top info bar - compact single line */}
        <div
          className="shrink-0 flex items-center justify-between px-3 bg-[#FFF9F0]"
          style={{ height: "44px" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.location.href =
                  "/family-game-platform/game/tetris/select";
              }}
              className="text-lg font-semibold text-[#8B7355] hover:text-foreground transition-colors"
              style={{ touchAction: "manipulation" }}
              aria-label="返回"
            >
              &larr;
            </button>
            <span className="text-base font-bold">俄罗斯方块</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span>
              分数: <span className="text-[#F97316]">{player.score}</span>
            </span>
            <span>
              消行: <span className="text-[#F97316]">{player.lines}</span>
            </span>
          </div>
        </div>

        {/* Middle: game board area - fills remaining space */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
          ref={boardContainerRef}
        >
          <div className="border-2 border-[#F3D9C1] rounded-lg overflow-hidden bg-white">
            <canvas ref={boardCanvasRef} className="block" />
          </div>
        </div>

        {/* Bottom controls area - compact */}
        <div
          className="shrink-0 flex flex-col items-center gap-[6px] px-3 pb-4 pt-1 bg-[#FFF9F0] overflow-hidden"
          style={{ touchAction: "manipulation", marginBottom: "clamp(70px, 10dvh, 120px)" }}
        >
          {mode === "single" ? (
            <SinglePlayerControls
              onAction={(action) => handleAction(0, action)}
              onPause={handlePause}
              onRestart={handleRestart}
              isPaused={isPaused}
              isIdle={isIdle}
              isGameOver={isGameOver}
            />
          ) : (
            <DuoControls
              onAction={handleAction}
              onPause={handlePause}
              onRestart={handleRestart}
              isPaused={isPaused}
              isIdle={isIdle}
              isGameOver={isGameOver}
            />
          )}
        </div>
      </div>

      {/* ---- Global overlay (idle / paused) ---- */}
      {(isIdle || isPaused) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#FFF9F0] border-2 border-[#F3D9C1] rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
            {isIdle && (
              <>
                <p className="text-2xl font-bold">准备开始</p>
                <Button
                  onClick={handleStart}
                  className="h-14 px-8 text-xl font-semibold rounded-xl"
                >
                  开始游戏
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <p className="text-2xl font-bold">游戏暂停</p>
                <Button
                  onClick={handlePause}
                  className="h-14 px-8 text-xl font-semibold rounded-xl"
                >
                  继续游戏
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <GameResultModal
        result={isGameOver ? (mode === "single" ? "lose" : state.winner === 0 ? "win" : state.winner === 1 ? "win" : "draw") : null}
        message={
          isGameOver
            ? mode === "single"
              ? `得分: ${player.score}`
              : state.winner === 0
              ? "玩家1 获胜！"
              : state.winner === 1
              ? "玩家2 获胜！"
              : "平局！"
            : ""
        }
        onRestart={handleRestart}
        onBack={() => {
          window.location.href = "/family-game-platform/game/tetris/menu";
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-[#F3D9C1] bg-white p-2 flex items-baseline justify-between">
      <span className="text-sm text-[#8B7355]">{label}</span>
      <span className="text-lg font-bold text-[#3D2C1E]">{value}</span>
    </div>
  );
}

/* Portrait controls for single player */
function SinglePlayerControls({
  onAction,
  onPause,
  onRestart,
  isPaused,
  isIdle,
  isGameOver,
}: {
  onAction: (action: string) => void;
  onPause: () => void;
  onRestart: () => void;
  isPaused: boolean;
  isIdle: boolean;
  isGameOver: boolean;
}) {
  return (
    <>
      {/* Row 1: Pause + Restart */}
      <div className="flex gap-2 w-full max-w-[400px]">
        <button
          onClick={onPause}
          disabled={isIdle || isGameOver}
          className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] disabled:opacity-50 transition-colors select-none"
          style={{ touchAction: "manipulation" }}
        >
          {isPaused ? "继续" : "暂停"}
        </button>
        <button
          onClick={onRestart}
          className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] transition-colors select-none"
          style={{ touchAction: "manipulation" }}
        >
          重新开始
        </button>
      </div>

      {/* Row 2: Rotate - wide button */}
      <div className="w-full max-w-[400px]">
        <ControlButton
          label="旋转"
          onAction={() => onAction("rotate")}
          colorClass="bg-[#FB923C] hover:bg-[#F97316] text-white"
          fullWidth
        />
      </div>

      {/* Row 3: Left / Down / Right */}
      <div className="flex gap-2 w-full max-w-[400px]">
        <ControlButton
          label="左"
          onAction={() => onAction("left")}
          repeatable
          colorClass="bg-[#E8E0D6] hover:bg-[#DDD5CB] text-[#3D2C1E]"
          fullWidth
        />
        <ControlButton
          label="下"
          onAction={() => onAction("down")}
          repeatable
          colorClass="bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#3D2C1E]"
          fullWidth
        />
        <ControlButton
          label="右"
          onAction={() => onAction("right")}
          repeatable
          colorClass="bg-[#E8E0D6] hover:bg-[#DDD5CB] text-[#3D2C1E]"
          fullWidth
        />
      </div>

      {/* Row 4: Hard drop - wide orange button */}
      <div className="w-full max-w-[400px]">
        <ControlButton
          label="硬降"
          onAction={() => onAction("hardDrop")}
          colorClass="bg-[#F97316] hover:bg-[#EA580C] text-white"
          fullWidth
        />
      </div>
    </>
  );
}

/* Portrait controls for duo */
function DuoControls({
  onAction,
  onPause,
  onRestart,
  isPaused,
  isIdle,
  isGameOver,
}: {
  onAction: (playerIndex: number, action: string) => void;
  onPause: () => void;
  onRestart: () => void;
  isPaused: boolean;
  isIdle: boolean;
  isGameOver: boolean;
}) {
  return (
    <>
      {/* Row 1: Pause + Restart */}
      <div className="flex gap-2 w-full max-w-[400px]">
        <button
          onClick={onPause}
          disabled={isIdle || isGameOver}
          className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] disabled:opacity-50 transition-colors select-none"
          style={{ touchAction: "manipulation" }}
        >
          {isPaused ? "继续" : "暂停"}
        </button>
        <button
          onClick={onRestart}
          className="flex-1 min-h-[48px] rounded-xl text-[18px] font-semibold bg-[#FEF3E2] hover:bg-[#FED7AA] transition-colors select-none"
          style={{ touchAction: "manipulation" }}
        >
          重新开始
        </button>
      </div>

      <div className="flex justify-center w-full max-w-[400px] gap-4">
        {/* Player 1 */}
        <div className="flex-1 flex flex-col items-center gap-[6px]">
          <span className="text-sm font-bold text-cyan-700">玩家1</span>
          <DuoSingleControls
            onAction={(a) => onAction(0, a)}
          />
        </div>
        {/* Player 2 */}
        <div className="flex-1 flex flex-col items-center gap-[6px]">
          <span className="text-sm font-bold text-orange-600">玩家2</span>
          <DuoSingleControls
            onAction={(a) => onAction(1, a)}
          />
        </div>
      </div>
    </>
  );
}

/* Compact single-player controls for duo portrait */
function DuoSingleControls({
  onAction,
}: {
  onAction: (action: string) => void;
}) {
  return (
    <>
      <ControlButton
        label="旋转"
        onAction={() => onAction("rotate")}
        colorClass="bg-[#FB923C] hover:bg-[#F97316] text-white"
        fullWidth
      />
      <div className="flex gap-2 w-full">
        <ControlButton
          label="左"
          onAction={() => onAction("left")}
          repeatable
          colorClass="bg-[#E8E0D6] hover:bg-[#DDD5CB] text-[#3D2C1E]"
          fullWidth
        />
        <ControlButton
          label="下"
          onAction={() => onAction("down")}
          repeatable
          colorClass="bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#3D2C1E]"
          fullWidth
        />
        <ControlButton
          label="右"
          onAction={() => onAction("right")}
          repeatable
          colorClass="bg-[#E8E0D6] hover:bg-[#DDD5CB] text-[#3D2C1E]"
          fullWidth
        />
      </div>
      <ControlButton
        label="硬降"
        onAction={() => onAction("hardDrop")}
        colorClass="bg-[#F97316] hover:bg-[#EA580C] text-white"
        fullWidth
      />
    </>
  );
}



