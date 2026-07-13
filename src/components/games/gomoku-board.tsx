"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type GameState,
  type GameMode,
  type Position,
  createInitialState,
  makeMove,
  undoMove,
  surrender,
  drawGame,
  getAIMove,
  getPlayerLabel,
  getPlayerEmoji,
} from "@/lib/games/gomoku";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GomokuBoardProps {
  mode: GameMode;
}

const BOARD_SIZE = 15;

export function GomokuBoard({ mode }: GomokuBoardProps) {
  const [state, setState] = useState<GameState>(() => createInitialState(mode));
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);
  const [lastMove, setLastMove] = useState<Position | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  // Dynamic board sizing based on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalc = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      // Board should be a square that fits in the container
      // Reserve space for controls at bottom (~140px) and status bar (~36px)
      const availH = h - 180; // approximate controls height
      const availW = w;
      const size = Math.max(100, Math.floor(Math.min(availW, availH)));
      setBoardSize(size);
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

  const isWinningCell = useCallback(
    (row: number, col: number) => {
      return state.winningLine.some((p) => p.row === row && p.col === col);
    },
    [state.winningLine]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (state.status !== "playing") return;
      if (mode === "pve" && state.currentPlayer === "white") return;

      const newState = makeMove(state, row, col);
      if (newState !== state) {
        setState(newState);
        setLastMove({ row, col });
      }
    },
    [state, mode]
  );

  // AI move
  useEffect(() => {
    if (mode !== "pve") return;
    if (state.status !== "playing") return;
    if (state.currentPlayer !== "white") return;

    const timer = setTimeout(() => {
      const aiMove = getAIMove(state);
      if (aiMove) {
        const newState = makeMove(state, aiMove.row, aiMove.col);
        setState(newState);
        setLastMove(aiMove);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [state, mode]);

  const handleUndo = useCallback(() => {
    setState((prev) => undoMove(prev));
    setLastMove(null);
  }, []);

  const handleDraw = useCallback(() => {
    setShowDrawDialog(true);
  }, []);

  const confirmDraw = useCallback(() => {
    setState((prev) => drawGame(prev));
    setShowDrawDialog(false);
  }, []);

  const handleSurrender = useCallback(() => {
    setShowSurrenderDialog(true);
  }, []);

  const confirmSurrender = useCallback(() => {
    setState((prev) =>
      surrender(prev, mode === "pve" ? "black" : prev.currentPlayer)
    );
    setShowSurrenderDialog(false);
  }, [mode]);

  const handleRestart = useCallback(() => {
    setState(createInitialState(mode));
    setLastMove(null);
  }, [mode]);

  const statusText = useMemo(() => {
    if (state.status === "won") {
      return `${getPlayerEmoji(state.winner!)} ${getPlayerLabel(state.winner!)} 获胜！`;
    }
    if (state.status === "draw") {
      return "平局！";
    }
    if (state.status === "surrender") {
      const loser = state.surrenderPlayer!;
      const winner = loser === "black" ? "white" : "black";
      return `${getPlayerEmoji(winner)} ${getPlayerLabel(loser)} 认输，${getPlayerLabel(winner)} 获胜！`;
    }
    return `${getPlayerEmoji(state.currentPlayer)} ${getPlayerLabel(state.currentPlayer)} 回合`;
  }, [state]);

  const canUndo = state.history.length > 0 && state.status === "playing";

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-full gap-1 overflow-hidden">
      {/* Status bar - compact */}
      <div
        className="shrink-0 w-full flex items-center justify-between px-2 rounded-lg bg-card border border-border"
        style={{ height: "36px" }}
      >
        <span className="text-sm font-bold truncate max-w-[60%]">
          {statusText}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {state.history.length}步
        </span>
      </div>

      {/* Board - adaptive square */}
      <div
        className="shrink-0 relative rounded-xl border-2 border-amber-700/40 dark:border-amber-600/30 bg-amber-100 dark:bg-amber-950/40 shadow-lg overflow-hidden"
        style={{
          width: boardSize > 0 ? `${boardSize}px` : "100%",
          aspectRatio: "1",
          maxWidth: "100%",
          maxHeight: "calc(100% - 190px)",
        }}
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
          preserveAspectRatio="none"
        >
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i}
              x2={BOARD_SIZE - 1}
              y2={i}
              stroke="currentColor"
              className="text-amber-800/60 dark:text-amber-400/40"
              strokeWidth={0.06}
            />
          ))}
          {Array.from({ length: BOARD_SIZE }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i}
              y1={0}
              x2={i}
              y2={BOARD_SIZE - 1}
              stroke="currentColor"
              className="text-amber-800/60 dark:text-amber-400/40"
              strokeWidth={0.06}
            />
          ))}
          {[3, 7, 11].map((r) =>
            [3, 7, 11].map((c) => (
              <circle
                key={`star-${r}-${c}`}
                cx={c}
                cy={r}
                r={0.12}
                className="fill-amber-800/60 dark:fill-amber-400/40"
              />
            ))
          )}
        </svg>

        {/* Cells / Pieces */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
          }}
        >
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const isLast = lastMove?.row === r && lastMove?.col === c;
              const isWin = isWinningCell(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={
                    state.status !== "playing" ||
                    cell !== null ||
                    (mode === "pve" && state.currentPlayer === "white")
                  }
                  className={cn(
                    "relative flex items-center justify-center",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:rounded-full",
                    "transition-transform duration-150",
                    cell === null && state.status === "playing" && "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                  aria-label={`第${r + 1}行第${c + 1}列`}
                >
                  {cell && (
                    <div
                      className={cn(
                        "w-[70%] h-[70%] rounded-full shadow-md transition-all duration-200",
                        cell === "black"
                          ? "bg-neutral-900 dark:bg-neutral-100"
                          : "bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600",
                        isLast && "ring-2 ring-primary ring-offset-1",
                        isWin && "ring-2 ring-red-500 ring-offset-1 animate-pulse"
                      )}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Controls - compact grid */}
      <div className="shrink-0 w-full grid grid-cols-4 gap-[6px] px-1" style={{ maxWidth: boardSize > 0 ? `${boardSize}px` : "400px" }}>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={cn(
            "min-h-[44px] rounded-lg text-[14px] font-medium border border-border bg-card",
            "disabled:opacity-50 active:scale-95 transition-transform select-none",
            "hover:bg-accent"
          )}
          style={{ touchAction: "manipulation" }}
        >
          悔棋
        </button>
        <button
          onClick={handleDraw}
          disabled={state.status !== "playing"}
          className={cn(
            "min-h-[44px] rounded-lg text-[14px] font-medium border border-border bg-card",
            "disabled:opacity-50 active:scale-95 transition-transform select-none",
            "hover:bg-accent"
          )}
          style={{ touchAction: "manipulation" }}
        >
          求和
        </button>
        <button
          onClick={handleSurrender}
          disabled={state.status !== "playing"}
          className={cn(
            "min-h-[44px] rounded-lg text-[14px] font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
            "disabled:opacity-50 active:scale-95 transition-transform select-none",
            "hover:opacity-90"
          )}
          style={{ touchAction: "manipulation" }}
        >
          认输
        </button>
        <button
          onClick={handleRestart}
          className={cn(
            "min-h-[44px] rounded-lg text-[14px] font-medium bg-primary text-primary-foreground",
            "active:scale-95 transition-transform select-none",
            "hover:opacity-90"
          )}
          style={{ touchAction: "manipulation" }}
        >
          重开
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={() => { window.location.href = "/family-game-platform/game/gomoku/menu"; }}
        className="shrink-0 text-sm text-muted-foreground hover:text-foreground active:scale-95 transition-all select-none"
        style={{ touchAction: "manipulation" }}
      >
        &larr; 返回菜单
      </button>

      {/* Draw Dialog */}
      <Dialog open={showDrawDialog} onOpenChange={setShowDrawDialog}>
        <DialogContent className="elderly-mode:scale-110">
          <DialogHeader>
            <DialogTitle className="text-xl elderly-mode:text-2xl">
              确认求和
            </DialogTitle>
            <DialogDescription className="text-base elderly-mode:text-lg">
              确定要和棋吗？双方将以平局结束本局。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDrawDialog(false)}
              className="h-14 text-lg elderly-mode:h-16 elderly-mode:text-xl"
            >
              取消
            </Button>
            <Button
              onClick={confirmDraw}
              className="h-14 text-lg elderly-mode:h-16 elderly-mode:text-xl"
            >
              确认求和
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Surrender Dialog */}
      <Dialog open={showSurrenderDialog} onOpenChange={setShowSurrenderDialog}>
        <DialogContent className="elderly-mode:scale-110">
          <DialogHeader>
            <DialogTitle className="text-xl elderly-mode:text-2xl">
              确认认输
            </DialogTitle>
            <DialogDescription className="text-base elderly-mode:text-lg">
              {mode === "pve"
                ? "确定要认输吗？AI将获得胜利。"
                : `确定要认输吗？${getPlayerLabel(
                    state.currentPlayer === "black" ? "white" : "black"
                  )}将获得胜利。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSurrenderDialog(false)}
              className="h-14 text-lg elderly-mode:h-16 elderly-mode:text-xl"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSurrender}
              className="h-14 text-lg elderly-mode:h-16 elderly-mode:text-xl"
            >
              确认认输
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
