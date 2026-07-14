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
  getAIMove,
  getPlayerLabel,
} from "@/lib/games/gomoku";
import { GameResultModal } from "@/components/game-result-modal";

interface GomokuBoardProps {
  mode: GameMode;
}

const BOARD_SIZE = 15;

export function GomokuBoard({ mode }: GomokuBoardProps) {
  const [state, setState] = useState<GameState>(() => createInitialState(mode));
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);
  const [lastMove, setLastMove] = useState<Position | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(0);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBoardPx(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (state.status !== "playing") return;
      if (mode === "pve" && state.currentPlayer === "white") return;
      if (boardPx === 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.round((x / boardPx) * BOARD_SIZE - 0.5);
      const row = Math.round((y / boardPx) * BOARD_SIZE - 0.5);

      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
      if (state.board[row][col] !== null) return;

      const newState = makeMove(state, row, col);
      if (newState !== state) {
        setState(newState);
        setLastMove({ row, col });
      }
    },
    [state, mode, boardPx]
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

  const gameResult = useMemo(() => {
    if (state.status === "won") {
      if (mode === "pve") {
        return state.winner === "black" ? "win" : "lose";
      }
      return "win";
    }
    if (state.status === "draw") return "draw";
    if (state.status === "surrender") {
      if (mode === "pve") {
        return state.winner === "black" ? "win" : "lose";
      }
      return "win";
    }
    return null;
  }, [state, mode]);

  const resultMessage = useMemo(() => {
    if (state.status === "won") {
      if (mode === "pve") {
        return state.winner === "black"
          ? "恭喜你击败了AI！"
          : "AI赢得了胜利！";
      }
      return `${getPlayerLabel(state.winner!)} 获胜！`;
    }
    if (state.status === "draw") return "双方势均力敌，本局平局。";
    if (state.status === "surrender") {
      const loser = state.surrenderPlayer!;
      return `${getPlayerLabel(loser)} 认输，${getPlayerLabel(
        loser === "black" ? "white" : "black"
      )} 获胜！`;
    }
    return "";
  }, [state, mode]);

  const canUndo = state.history.length > 0 && state.status === "playing";

  return (
    <div className="flex flex-col items-center w-full h-full overflow-hidden">
      {/* Status bar */}
      <div className="shrink-0 w-full flex items-center justify-between px-3 py-2">
        <span className="text-sm font-bold text-[#5D4037]">
          {state.status === "playing"
            ? `${state.currentPlayer === "black" ? "黑棋" : "白棋"} 回合`
            : state.status === "won"
            ? `${getPlayerLabel(state.winner!)} 获胜`
            : state.status === "draw"
            ? "平局"
            : "已结束"}
        </span>
        <span className="text-xs text-[#8D6E63]">
          {state.history.length} 步
        </span>
      </div>

      {/* Board area */}
      <div className="flex-1 min-h-0 flex items-center justify-center w-full px-[3vw]">
        <div
          ref={boardRef}
          className="relative select-none"
          style={{
            width: "min(94vw, calc(100dvh - 260px))",
            aspectRatio: "1",
            touchAction: "manipulation",
          }}
          onClick={handleBoardClick}
        >
          {boardPx > 0 && (
            <>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 15 15"
                preserveAspectRatio="none"
              >
                <rect
                  x="0"
                  y="0"
                  width="15"
                  height="15"
                  fill="#DEB887"
                  rx="3"
                />
                {Array.from({ length: BOARD_SIZE }, (_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0.5}
                    y1={i + 0.5}
                    x2={14.5}
                    y2={i + 0.5}
                    stroke="#5D4037"
                    strokeWidth={0.05}
                  />
                ))}
                {Array.from({ length: BOARD_SIZE }, (_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i + 0.5}
                    y1={0.5}
                    x2={i + 0.5}
                    y2={14.5}
                    stroke="#5D4037"
                    strokeWidth={0.05}
                  />
                ))}
                {[3, 7, 11].map((r) =>
                  [3, 7, 11].map((c) => (
                    <circle
                      key={`star-${r}-${c}`}
                      cx={c + 0.5}
                      cy={r + 0.5}
                      r={0.12}
                      fill="#5D4037"
                    />
                  ))
                )}
              </svg>

              {/* Pieces */}
              {state.board.map((row, r) =>
                row.map((cell, c) => {
                  if (!cell) return null;
                  const isLast =
                    lastMove?.row === r && lastMove?.col === c;
                  const isWin = state.winningLine.some(
                    (p) => p.row === r && p.col === c
                  );
                  const pieceSizePct = (0.72 / BOARD_SIZE) * 100;
                  const leftPct = ((c + 0.5) / BOARD_SIZE) * 100;
                  const topPct = ((r + 0.5) / BOARD_SIZE) * 100;

                  return (
                    <div
                      key={`piece-${r}-${c}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${pieceSizePct}%`,
                        height: `${pieceSizePct}%`,
                        transform: "translate(-50%, -50%)",
                        borderRadius: "50%",
                        aspectRatio: "1",
                        ...(cell === "black"
                          ? {
                              background:
                                "radial-gradient(circle at 35% 35%, #555555, #0a0a0a)",
                              boxShadow:
                                "2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(0,0,0,0.3)",
                            }
                          : {
                              background: "#F5F5DC",
                              border: "1px solid #A0A0A0",
                              boxShadow:
                                "2px 2px 5px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(0,0,0,0.1)",
                            }),
                        ...(isWin
                          ? {
                              boxShadow: `0 0 0 2px #EF4444, ${
                                cell === "black"
                                  ? "2px 2px 5px rgba(0,0,0,0.5)"
                                  : "2px 2px 5px rgba(0,0,0,0.3)"
                              }`,
                            }
                          : {}),
                      }}
                    >
                      {isLast && (
                        <div
                          className="absolute"
                          style={{
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "28%",
                            height: "28%",
                            borderRadius: "50%",
                            background: "#EF4444",
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className="shrink-0 w-full grid grid-cols-3 gap-2 px-4 max-w-md py-2"
        style={{ marginBottom: "clamp(70px, 10dvh, 120px)" }}
      >
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={cn(
            "min-h-[48px] rounded-xl text-base font-medium border border-[#D4A574] bg-[#FFF8F0]",
            "disabled:opacity-50 active:scale-95 transition-transform select-none",
            "text-[#5D4037]"
          )}
          style={{ touchAction: "manipulation" }}
        >
          悔棋
        </button>
        <button
          onClick={handleSurrender}
          disabled={state.status !== "playing"}
          className={cn(
            "min-h-[48px] rounded-xl text-base font-medium bg-red-100 text-red-700",
            "disabled:opacity-50 active:scale-95 transition-transform select-none",
            "border border-red-200"
          )}
          style={{ touchAction: "manipulation" }}
        >
          认输
        </button>
        <button
          onClick={handleRestart}
          className={cn(
            "min-h-[48px] rounded-xl text-base font-medium bg-[#5D4037] text-white",
            "active:scale-95 transition-transform select-none"
          )}
          style={{ touchAction: "manipulation" }}
        >
          重新开始
        </button>
      </div>

      {/* Surrender confirmation */}
      {showSurrenderDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowSurrenderDialog(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[#5D4037]">确认认输</h3>
            <p className="text-base text-gray-600 text-center">
              {mode === "pve"
                ? "确定要认输吗？AI将获得胜利。"
                : "确定要认输吗？对手将获得胜利。"}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowSurrenderDialog(false)}
                className="flex-1 min-h-[48px] rounded-xl text-base font-medium border border-gray-300 text-gray-700 active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={confirmSurrender}
                className="flex-1 min-h-[48px] rounded-xl text-base font-medium bg-red-600 text-white active:scale-95 transition-transform"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <GameResultModal
        result={gameResult}
        message={resultMessage}
        onRestart={handleRestart}
        onBack={() => {
          window.location.href =
            "/family-game-platform/game/gomoku/select";
        }}
      />
    </div>
  );
}
