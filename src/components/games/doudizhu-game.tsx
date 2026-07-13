"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type PokerCard,
  type HandPattern,
  detectHandPattern,
  canPlayBeat,
  suggestPlay,
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
    // clamp(42px, 8vw, 72px) => 实际 8vw 需要 viewport 宽度
    // 用容器宽度近似：8% of window width
    const vwWidth = Math.round(containerWidth / 0.9); // 近似 viewport 宽度
    const clampedCardWidth = Math.min(72, Math.max(42, Math.round(vwWidth * 0.08)));
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
      }, 1000);
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
      }, elderlyMode ? 2000 : 1200);
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
    return Math.max(step, cardWidth * 0.22);
  }, [cardCount, cardWidth, availableWidth, naturalWidth]);

  // 手牌总宽度（用于居中）
  const totalHandWidth = cardCount > 0 ? cardStep * (cardCount - 1) + cardWidth : 0;

  // ========== 渲染：玩家头像区域（其他玩家） ==========
  const renderPlayerInfo = (index: PlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && state.phase === "playing";
    const isLandlord = state.landlord === index;

    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border-2 bg-card/90 backdrop-blur-sm"
        style={isCurrent
          ? { borderColor: "var(--color-yellow-400)", background: "rgba(254,249,195,0.8)" }
          : { borderColor: "var(--color-border)" }
        }
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0",
            isLandlord
              ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isLandlord ? "地" : "农"}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm leading-tight truncate">
            {getPlayerName(index, player.isAI)}
          </span>
          <span className="text-xs text-muted-foreground">
            剩余 {player.hand.length} 张
          </span>
        </div>
        {isCurrent && (
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 animate-pulse shrink-0">
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
              width: "clamp(18px, 4vw, 28px)",
              aspectRatio: "0.7",
              marginLeft: i === 0 ? 0 : "-clamp(10px, 2.5vw, 16px)",
              borderRadius: "4px",
              border: "1.5px solid var(--color-border)",
              background: "linear-gradient(135deg, rgba(99,102,241,0.7), rgba(99,102,241,0.9))",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              zIndex: i,
              position: "relative",
            }}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1.5 shrink-0">
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
          height: "clamp(100px, 22vw, 170px)", // 留出选中牌抬起的空间
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
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col w-full h-full bg-background"
      style={{ overflow: "hidden" }}
    >
      {/* 顶部信息栏 */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2 bg-background/80 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xl hover:scale-110 transition-transform"
              aria-label="返回"
            >
              ←
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-tight">斗地主</h1>
            <span className="text-xs text-muted-foreground leading-tight">
              {state.phase === "bidding"
                ? "叫地主阶段"
                : state.phase === "playing"
                  ? state.landlord !== null
                    ? `${getPlayerName(state.landlord, state.players[state.landlord].isAI)} 是地主`
                    : "出牌中"
                  : "游戏结束"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {state.bombCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
              x{state.bombCount}
            </span>
          )}
          {state.rocketCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              x{state.rocketCount}
            </span>
          )}
          {state.landlord !== null && (
            <span className="text-xs text-muted-foreground">
              倍数: {Math.pow(2, state.bombCount + state.rocketCount)}x
            </span>
          )}
        </div>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className="shrink-0 px-4 py-1.5 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-medium">
            {message}
          </span>
        </div>
      )}

      {/* 游戏主区域 */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 上方区域：其他玩家 + 中央出牌区 */}
        <div className="flex-1 flex flex-col min-h-0 px-2 pt-1">
          {/* 上方其他玩家行 */}
          <div className="shrink-0 flex justify-between items-start gap-2">
            {/* 左侧玩家（玩家2） */}
            <div className="flex flex-col items-start gap-1 min-w-0" style={{ maxWidth: "35%" }}>
              {renderPlayerInfo(2)}
              {renderCardBacks(2)}
            </div>

            {/* 右侧玩家（玩家1） */}
            <div className="flex flex-col items-end gap-1 min-w-0" style={{ maxWidth: "35%" }}>
              {renderPlayerInfo(1)}
              {renderCardBacks(1)}
            </div>
          </div>

          {/* 中央出牌区 */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2">
            {/* 底牌显示（叫地主结束后短暂显示） */}
            {state.phase === "playing" && state.landlord !== null && state.bottomCards.length > 0 && (
              <div className="shrink-0 flex items-center justify-center gap-1 mb-2">
                <span className="text-xs text-muted-foreground mr-1">底牌:</span>
                {state.bottomCards.map((card) => (
                  <PokerCardComponent key={card.id} card={card} size="sm" disabled />
                ))}
              </div>
            )}

            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">
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
                <span className="text-sm font-medium text-muted-foreground">
                  {handTypeName(state.currentPlay.type)}
                </span>
              </div>
            )}
            {!state.currentPlay && state.phase === "playing" && (
              <div className="text-sm text-muted-foreground">
                {state.currentPlayPlayer === 0 ? "新一轮，请出牌" : "等待出牌..."}
              </div>
            )}

            {/* 叫地主界面 */}
            {state.phase === "bidding" && state.currentPlayer === 0 && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-lg font-bold">轮到您叫地主</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleBid("call")}
                    className="h-12 px-6 text-lg font-bold"
                  >
                    叫地主
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBid("pass")}
                    className="h-12 px-6 text-lg font-bold"
                  >
                    不叫
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 下方区域：操作按钮 + 玩家信息 + 手牌 */}
        <div className="shrink-0 flex flex-col">
          {/* 操作按钮 - 始终放在手牌上方 */}
          {state.phase === "playing" && (
            <div className="flex justify-center gap-2 px-3 py-1.5">
              <Button
                variant="secondary"
                onClick={handleHint}
                className="h-9 px-4 text-sm font-bold"
                disabled={!isPlayerTurn}
              >
                提示
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                disabled={
                  !isPlayerTurn ||
                  state.currentPlay === null ||
                  state.currentPlayPlayer === 0
                }
                className="h-9 px-4 text-sm font-bold"
              >
                不出
              </Button>
              <Button
                onClick={handlePlay}
                disabled={!isPlayerTurn || selectedCards.size === 0}
                className="h-9 px-4 text-sm font-bold"
              >
                出牌
              </Button>
            </div>
          )}

          {/* 玩家信息（自己） */}
          <div className="flex justify-center px-3 pb-1">
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
        </div>
      </main>

      {/* 游戏结束弹窗 */}
      {showResult && state.phase === "finished" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              {state.winner === 0 ? "您赢了！" : "您输了"}
            </h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-lg">
                <span>赢家:</span>
                <span className="font-bold">
                  {state.winner !== null
                    ? getPlayerName(state.winner, state.players[state.winner].isAI)
                    : ""}
                </span>
              </div>
              {state.spring && (
                <div className="text-center text-red-500 font-bold">
                  春天！
                </div>
              )}
              {state.antiSpring && (
                <div className="text-center text-red-500 font-bold">
                  反春！
                </div>
              )}
              {state.scores && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="flex justify-between text-base">
                    <span>地主得分:</span>
                    <span
                      className={cn(
                        "font-bold",
                        state.scores.landlord > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {state.scores.landlord > 0 ? "+" : ""}
                      {state.scores.landlord}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span>农民1得分:</span>
                    <span
                      className={cn(
                        "font-bold",
                        state.scores.peasant1 > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {state.scores.peasant1 > 0 ? "+" : ""}
                      {state.scores.peasant1}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span>农民2得分:</span>
                    <span
                      className={cn(
                        "font-bold",
                        state.scores.peasant2 > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {state.scores.peasant2 > 0 ? "+" : ""}
                      {state.scores.peasant2}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRestart}
                className="flex-1 h-12 text-lg font-bold"
              >
                再来一局
              </Button>
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 h-12 text-lg font-bold"
                >
                  返回菜单
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
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