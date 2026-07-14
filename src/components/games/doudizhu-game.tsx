"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type PokerCard,
  type HandPattern,
  detectHandPattern,
  canPlayBeat,
  suggestPlay,
  isRedSuit,
  RANK_DISPLAY,
} from "@/lib/games/poker";
import {
  type DoudizhuState,
  type PlayerIndex,
  type BidAction,
  type PlayAction,
  createInitialState,
  doBid,
  doPlay,
  aiBidDecision,
  aiPlayDecision,
  getPlayerName,
} from "@/lib/games/doudizhu";
import { PokerCard as PokerCardComponent } from "./poker-card";
import { GameResultModal } from "@/components/game-result-modal";

interface DoudizhuGameProps {
  onBack?: () => void;
}

export function DoudizhuGame({ onBack }: DoudizhuGameProps) {
  const [state, setState] = useState<DoudizhuState>(createInitialState);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [pressedCardId, setPressedCardId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(375);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handContainerRef = useRef<HTMLDivElement>(null);
  const elderlyMode = false;

  // 观测容器宽度 + 计算实际 clamp 牌宽
  const { handContainerWidth, cardWidth } = useMemo(() => {
    // 牌宽 clamp(48px, 10vw, 72px)
    const clampedCardWidth = Math.min(72, Math.max(48, Math.round(containerWidth * 0.10)));
    return {
      handContainerWidth: containerWidth,
      cardWidth: clampedCardWidth,
    };
  }, [containerWidth]);

  useEffect(() => {
    const el = handContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 清除定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // AI 回合处理
  useEffect(() => {
    if (state.phase === "bidding" && state.players[state.currentPlayer].isAI) {
      timerRef.current = setTimeout(() => {
        const action = aiBidDecision(state);
        setState((prev) => doBid(prev, action));
        setMessage(
          `${getPlayerName(state.currentPlayer, true)} ${action === "call" ? "叫地主" : "不叫"}`
        );
      }, 2000);
    } else if (
      state.phase === "playing" &&
      state.players[state.currentPlayer].isAI
    ) {
      timerRef.current = setTimeout(() => {
        const action = aiPlayDecision(state);
        setState((prev) => {
          const newState = doPlay(prev, action);
          if (action.type === "pass") {
            setMessage(
              `${getPlayerName(prev.currentPlayer, true)} 不出`
            );
          } else {
            const pattern = detectHandPattern(action.cards);
            setMessage(
              `${getPlayerName(prev.currentPlayer, true)} 出了 ${pattern ? handTypeName(pattern.type) : ""}`
            );
          }
          return newState;
        });
      }, 2500);
    } else if (state.phase === "finished" && !showResult) {
      timerRef.current = setTimeout(() => {
        setShowResult(true);
      }, 800);
    }
  }, [state, elderlyMode, showResult]);

  // 玩家叫地主
  const handleBid = useCallback((action: BidAction) => {
    setState((prev) => doBid(prev, action));
    setMessage(action === "call" ? "您叫了地主" : "您选择不叫");
  }, []);

  // 玩家选择/取消选择牌
  const toggleCard = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // 获取当前选中的牌
  const getSelectedCards = useCallback((): PokerCard[] => {
    const hand = state.players[0].hand;
    return hand.filter((c) => selectedCards.has(c.id));
  }, [state.players, selectedCards]);

  // 玩家出牌
  const handlePlay = useCallback(() => {
    const cards = getSelectedCards();
    if (cards.length === 0) {
      setMessage("请先选择要出的牌");
      return;
    }
    if (!canPlayBeat(cards, state.currentPlay)) {
      setMessage("出牌不符合规则或管不上");
      return;
    }
    const action: PlayAction = { type: "play", cards };
    setState((prev) => doPlay(prev, action));
    setSelectedCards(new Set());
    const pattern = detectHandPattern(cards);
    setMessage(`您出了 ${pattern ? handTypeName(pattern.type) : ""}`);
  }, [getSelectedCards, state.currentPlay]);

  // 玩家不出
  const handlePass = useCallback(() => {
    if (
      state.currentPlay === null ||
      state.currentPlayPlayer === 0
    ) {
      setMessage("您是首家，必须出牌");
      return;
    }
    const action: PlayAction = { type: "pass" };
    setState((prev) => doPlay(prev, action));
    setSelectedCards(new Set());
    setMessage("您选择不出");
  }, [state.currentPlay, state.currentPlayPlayer]);

  // 提示
  const handleHint = useCallback(() => {
    const hand = state.players[0].hand;
    const suggestion = suggestPlay(hand, state.currentPlay);
    if (!suggestion) {
      setMessage("没有牌能管上，建议不出");
      return;
    }
    const ids = new Set(suggestion.map((c) => c.id));
    setSelectedCards(ids);
    setMessage("已为您推荐出牌");
  }, [state.players, state.currentPlay]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setState(createInitialState());
    setSelectedCards(new Set());
    setMessage("");
    setShowResult(false);
  }, []);

  // 当前玩家
  const isPlayerTurn =
    state.phase === "playing" && state.currentPlayer === 0 && !state.players[0].isAI;

  // 胜负结果
  const gameResult = useMemo(() => {
    if (state.phase !== "finished" || state.winner === null) return null;
    const playerIsLandlord = state.landlord === 0;
    const landlordWon = state.winner === state.landlord;
    if (playerIsLandlord) {
      return landlordWon ? "win" : "lose";
    } else {
      return landlordWon ? "lose" : "win";
    }
  }, [state.phase, state.winner, state.landlord]);

  const resultMessage = useMemo(() => {
    if (state.phase !== "finished") return undefined;
    const parts: string[] = [];
    if (state.spring) parts.push("春天！");
    if (state.antiSpring) parts.push("反春！");
    if (state.scores) {
      const myScore = state.landlord === 0 ? state.scores.landlord : state.scores.peasant1;
      parts.push(`得分 ${myScore > 0 ? "+" : ""}${myScore}`);
    }
    return parts.join(" ") || undefined;
  }, [state]);

  // ========== 手牌重叠布局计算 ==========
  const handCards = state.players[0].hand;
  const cardCount = handCards.length;

  const containerPadding = 8; // px 左右各留白
  const naturalWidth = cardWidth * cardCount;
  const availableWidth = handContainerWidth - containerPadding * 2;

  const cardStep = useMemo(() => {
    if (cardCount <= 1) return cardWidth;
    let step = cardWidth;
    if (naturalWidth > availableWidth) {
      step = (availableWidth - cardWidth) / (cardCount - 1);
    }
    return Math.max(step, cardWidth * 0.32);
  }, [cardCount, cardWidth, availableWidth, naturalWidth]);

  // 手牌总宽度（用于居中）
  const totalHandWidth = cardCount > 0 ? cardStep * (cardCount - 1) + cardWidth : 0;

  // ========== 渲染：玩家头像区域（其他玩家） ==========
  const renderPlayerInfo = (index: PlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && state.phase === "playing";
    const isLandlord = state.landlord === index;

    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-black/30 backdrop-blur-sm border-2"
        style={isCurrent
          ? { borderColor: "#FBBF24", boxShadow: "0 0 8px rgba(251,191,36,0.4)" }
          : { borderColor: "rgba(255,255,255,0.1)" }
        }
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0",
            isLandlord
              ? "bg-red-500/80 text-white"
              : "bg-white/20 text-white"
          )}
        >
          {isLandlord ? "地" : "农"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm leading-tight truncate text-white">
            {getPlayerName(index, player.isAI)}
          </span>
          <span className="text-xs text-white/70">
            剩余 {player.hand.length} 张
          </span>
        </div>
        {isCurrent && (
          <span
            className="text-xs font-bold text-yellow-300 shrink-0 inline-block"
            style={{ minWidth: "48px", textAlign: "center" }}
          >
            思考中...
          </span>
        )}
      </div>
    );
  };

  // ========== 渲染：其他玩家牌背 ==========
  const renderCardBacks = (index: PlayerIndex) => {
    const count = state.players[index].hand.length;
    const visualCount = Math.min(Math.max(count, 5), 8);
    return (
      <div className="flex items-end justify-center" style={{ gap: "-4px" }}>
        {Array.from({ length: visualCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: "clamp(18px, 3vw, 28px)",
              aspectRatio: "0.7",
              marginLeft: i === 0 ? 0 : "-clamp(10px, 2vw, 16px)",
              borderRadius: "4px",
              border: "1.5px solid rgba(255,255,255,0.2)",
              background: "linear-gradient(135deg, #3949AB, #1A237E)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              zIndex: i,
              position: "relative",
            }}
          />
        ))}
        <span className="text-xs text-white/60 ml-1.5 shrink-0">
          {count}张
        </span>
      </div>
    );
  };

  // ========== 渲染：手牌区域（重叠布局） ==========
  const renderHandCards = () => {
    if (cardCount === 0) return null;

    return (
      <div
        ref={handContainerRef}
        className="relative w-full flex justify-center"
        style={{
          paddingLeft: containerPadding,
          paddingRight: containerPadding,
          height: "clamp(110px, 24vw, 180px)", // 留出选中牌抬起的空间
        }}
      >
        <div
          className="relative"
          style={{
            width: totalHandWidth,
            height: "100%",
          }}
        >
          {handCards.map((card, idx) => {
            const isSelected = selectedCards.has(card.id);
            const isPressed = pressedCardId === card.id;
            // 选中牌抬起20%，按住中的牌临时更高z-index
            const liftY = isSelected ? "20%" : isPressed ? "8%" : "0%";
            // z-index：按住 > 选中 > 未选中（越靠右越大）
            const baseZ = idx + 1;
            const zIndex = isPressed ? cardCount + 10 : isSelected ? cardCount + baseZ : baseZ;

            return (
              <div
                key={card.id}
                className="absolute top-0"
                style={{
                  left: idx * cardStep,
                  width: cardWidth,
                  height: "100%",
                  zIndex,
                  transform: `translateY(-${liftY})`,
                  transition: "transform 0.15s ease, z-index 0s",
                }}
                onTouchStart={(e) => {
                  setPressedCardId(card.id);
                }}
                onTouchEnd={() => {
                  setPressedCardId(null);
                }}
                onMouseDown={() => {
                  setPressedCardId(card.id);
                }}
                onMouseUp={() => {
                  setPressedCardId(null);
                }}
              >
                <PokerCardComponent
                  card={card}
                  selected={isSelected}
                  onClick={() => {
                    if (isPlayerTurn) toggleCard(card.id);
                  }}
                  disabled={!isPlayerTurn}
                  size="hand"
                  style={{ width: cardWidth }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 外层木质边框 + 绿色牌桌 */}
      <div
        className="flex-1 m-1 sm:m-2 rounded-2xl border-[6px] sm:border-[8px] overflow-hidden flex flex-col"
        style={{
          background: "#1B5E20",
          borderColor: "#8D6E63",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* 顶部信息栏 */}
        <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-black/20 border-b border-white/10">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-xl sm:text-2xl text-white hover:scale-110 transition-transform"
                aria-label="返回"
              >
                ←
              </button>
            )}
            <h1 className="text-base sm:text-lg font-bold text-white">斗地主</h1>
          </div>

          {/* 中间：底牌 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/60">底牌</span>
            {state.bottomCards.length > 0 && (
              <div className="flex items-center gap-0.5">
                {state.bottomCards.map((card) => {
                  const showFace = state.phase === "playing" && state.landlord !== null;
                  return (
                    <div
                      key={card.id}
                      className="inline-flex items-center justify-center rounded border font-bold leading-none"
                      style={{
                        width: "clamp(22px, 4vw, 34px)",
                        aspectRatio: "0.7",
                        fontSize: "clamp(9px, 1.6vw, 12px)",
                        borderColor: showFace
                          ? (isRedSuit(card.suit) ? "#fecaca" : "#e5e7eb")
                          : "rgba(255,255,255,0.2)",
                        background: showFace ? "#fff" : "linear-gradient(135deg, #3949AB, #1A237E)",
                        color: showFace
                          ? (isRedSuit(card.suit) ? "#dc2626" : "#374151")
                          : "transparent",
                      }}
                    >
                      {showFace ? RANK_DISPLAY[card.rank] : ""}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {state.bombCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/80 text-white font-bold">
                💣x{state.bombCount}
              </span>
            )}
            {state.landlord !== null && (
              <span className="text-sm font-bold text-yellow-300">
                {Math.pow(2, state.bombCount + state.rocketCount)}x
              </span>
            )}
          </div>
        </header>

        {/* 游戏主区域 */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 上方：左右玩家 */}
          <div className="shrink-0 flex justify-between items-start px-2 sm:px-3 py-2">
            <div className="flex flex-col items-start gap-1 min-w-0" style={{ maxWidth: "38%" }}>
              {renderPlayerInfo(2)}
              {renderCardBacks(2)}
            </div>
            <div className="flex flex-col items-end gap-1 min-w-0" style={{ maxWidth: "38%" }}>
              {renderPlayerInfo(1)}
              {renderCardBacks(1)}
            </div>
          </div>

          {/* 中央区域 */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2 gap-2">
            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs sm:text-sm text-white/80 font-medium">
                  {getPlayerName(state.currentPlayPlayer, state.players[state.currentPlayPlayer].isAI)} 出牌
                </span>
                <div className="flex justify-center gap-1 flex-wrap">
                  {state.currentPlay.cards.map((card) => (
                    <PokerCardComponent
                      key={card.id}
                      card={card}
                      size="md"
                      disabled
                    />
                  ))}
                </div>
                <span className="text-sm sm:text-base font-bold text-yellow-300">
                  {handTypeName(state.currentPlay.type)}
                </span>
              </div>
            )}
            {!state.currentPlay && state.phase === "playing" && (
              <div className="text-sm sm:text-base text-white/60">
                {state.currentPlayPlayer === 0 ? "新一轮，请出牌" : "等待出牌..."}
              </div>
            )}

            {/* 消息提示 */}
            {message && (
              <div className="px-4 py-1.5 rounded-full bg-black/40 text-white text-xs sm:text-sm font-medium">
                {message}
              </div>
            )}

            {/* 叫地主界面 */}
            {state.phase === "bidding" && state.currentPlayer === 0 && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-lg sm:text-xl font-bold text-white">轮到您叫地主</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleBid("call")}
                    className="h-14 px-8 rounded-xl text-lg font-bold text-white bg-amber-600 hover:bg-amber-700 border border-amber-700 shadow-lg transition-colors"
                  >
                    叫地主
                  </button>
                  <button
                    onClick={() => handleBid("pass")}
                    className="h-14 px-8 rounded-xl text-lg font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                  >
                    不叫
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 - 手牌上方 */}
          {state.phase === "playing" && (
            <div className="shrink-0 flex justify-center gap-3 px-3 py-2">
              <button
                onClick={handleHint}
                disabled={!isPlayerTurn}
                className="h-12 px-5 rounded-xl text-base font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                提示
              </button>
              <button
                onClick={handlePass}
                disabled={
                  !isPlayerTurn ||
                  state.currentPlay === null ||
                  state.currentPlayPlayer === 0
                }
                className="h-12 px-5 rounded-xl text-base font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                不出
              </button>
              <button
                onClick={handlePlay}
                disabled={!isPlayerTurn || selectedCards.size === 0}
                className="h-12 px-5 rounded-xl text-base font-bold text-white bg-amber-600 hover:bg-amber-700 border border-amber-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
              >
                出牌
              </button>
            </div>
          )}

          {/* 玩家信息（自己） */}
          <div className="shrink-0 flex justify-center px-3 pb-1">
            {renderPlayerInfo(0)}
          </div>

          {/* 手牌区域（重叠展示） */}
          <div
            className="shrink-0 w-full"
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 4px)",
            }}
          >
            {renderHandCards()}
          </div>
        </main>
      </div>

      {/* 游戏结束弹窗 */}
      <GameResultModal
        result={showResult ? gameResult : null}
        message={resultMessage}
        onRestart={handleRestart}
        onBack={() => {
          if (onBack) onBack();
        }}
      />
    </div>
  );
}

/** 牌型中文名称 */
function handTypeName(type: HandPattern["type"]): string {
  const names: Record<string, string> = {
    single: "单张",
    pair: "对子",
    triple: "三张",
    "triple-with-single": "三带一",
    "triple-with-pair": "三带二",
    straight: "顺子",
    "straight-pair": "连对",
    airplane: "飞机",
    "airplane-with-wings": "飞机带翅膀",
    bomb: "炸弹",
    rocket: "火箭",
    "quad-with-two": "四带二",
    "quad-with-two-pairs": "四带两对",
  };
  return names[type] || type;
}
