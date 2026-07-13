"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type GameState,
  type GameMode,
  type Position,
  type Player,
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
      return "🤝 平局！";
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
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl mx-auto px-2">
      {/* Status bar */}
      <div
        className={cn(
          "w-full flex items-center justify-between rounded-xl border border-border bg-card p-4",
          "elderly-mode:p-6"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-2xl font-bold",
              state.status === "playing"
                ? state.currentPlayer === "black"
                  ? "text-black dark:text-white"
                  : "text-neutral-500 dark:text-neutral-300"
                : "text-primary"
            )}
          >
            {statusText}
          </span>
        </div>
        <div className="text-sm text-muted-foreground elderly-mode:text-lg">
          步数: {state.history.length}
        </div>
      </div>

      {/* Board */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-amber-700/40 dark:border-amber-600/30",
          "bg-amber-100 dark:bg-amber-950/40",
          "shadow-lg overflow-hidden",
          "w-full aspect-square max-w-[min(100vw-2rem,600px)]"
        )}
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
          preserveAspectRatio="none"
        >
          {/* Horizontal lines */}
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
          {/* Vertical lines */}
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
          {/* Star points (tian yuan and others) */}
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

      {/* Controls */}
      <div className="w-full grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={!canUndo}
          className={cn(
            "h-14 text-lg font-medium elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          ↩️ 悔棋
        </Button>
        <Button
          variant="outline"
          onClick={handleDraw}
          disabled={state.status !== "playing"}
          className={cn(
            "h-14 text-lg font-medium elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          🤝 求和
        </Button>
        <Button
          variant="destructive"
          onClick={handleSurrender}
          disabled={state.status !== "playing"}
          className={cn(
            "h-14 text-lg font-medium elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          🏳️ 认输
        </Button>
        <Button
          variant="default"
          onClick={handleRestart}
          className={cn(
            "h-14 text-lg font-medium elderly-mode:h-16 elderly-mode:text-xl"
          )}
        >
          🔄 重新开始
        </Button>
      </div>

      <Button
        variant="ghost"
        onClick={() => { window.location.href = "/family-game-platform/game/gomoku/menu"; }}
        className="h-14 text-lg elderly-mode:h-16 elderly-mode:text-xl"
      >
        ← 返回菜单
      </Button>

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
