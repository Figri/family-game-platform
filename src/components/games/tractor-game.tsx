"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type TractorState,
  type TractorPlayerIndex,
  type TractorPlayAction,
  type TractorBidAction,
  createTractorInitialState,
  doTractorPlay,
  doTractorBid,
  aiTractorPlayDecision,
  aiTractorBidDecision,
  getTractorPlayerName,
  getTractorTeammate,
  tractorHandTypeName,
  detectTractorPattern,
  canPlayTractorBeat,
  suggestTractorPlay,
  getTrumpSuitName,
  type TrumpSuit,
  isTrumpCard,
  type RankDisplay,
} from "@/lib/games/tractor";
import { PokerCard as PokerCardComponent, PokerCardBack } from "./poker-card";
import { type PokerCard as PokerCardType } from "@/lib/games/poker";

interface TractorGameProps {
  onBack?: () => void;
}

/** 手牌重叠布局（与掼蛋类似但带主牌高亮） */
function OverlappingHand({
  cards,
  selectedCards,
  isPlayerTurn,
  onToggleCard,
  trumpSuit,
  currentLevel,
}: {
  cards: PokerCardType[];
  selectedCards: Set<string>;
  isPlayerTurn: boolean;
  onToggleCard: (cardId: string) => void;
  trumpSuit: TrumpSuit;
  currentLevel: RankDisplay;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 计算 cardWidth (px)，使用 clamp 逻辑
  const cardWidth = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 375;
    const w = Math.min(Math.max(Math.floor(vw * 0.07), 36), 64);
    return w;
  }, []);

  // 计算重叠步长
  const step = useMemo(() => {
    const paddingX = 16;
    const availableWidth = containerWidth - paddingX;
    const cardCount = cards.length;
    if (cardCount <= 1) return cardWidth;
    const naturalWidth = cardWidth * cardCount;
    let s = cardWidth;
    if (naturalWidth > availableWidth) {
      s = (availableWidth - cardWidth) / (cardCount - 1);
    }
    return Math.max(s, cardWidth * 0.18);
  }, [cards.length, cardWidth, containerWidth]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-end justify-center w-full"
      style={{ height: cardWidth * 1.4 + 16 }}
    >
      <div
        className="relative"
        style={{
          width: step * (cards.length - 1) + cardWidth,
          height: cardWidth * 1.4 + 16,
        }}
      >
        {cards.map((card, idx) => {
          const isSelected = selectedCards.has(card.id);
          const isTrump = isTrumpCard(card, trumpSuit, currentLevel);
          return (
            <div
              key={card.id}
              className="absolute top-0"
              style={{
                left: idx * step,
                zIndex: idx + (isSelected ? 100 : 0),
                transform: isSelected ? "translateY(-10px)" : "translateY(0)",
                transition: "transform 0.15s ease",
              }}
            >
              <div
                className={cn(
                  "rounded-md transition-shadow",
                  isTrump &&
                    "ring-2 ring-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.5)]"
                )}
              >
                <PokerCardComponent
                  card={card}
                  size="hand"
                  selected={isSelected}
                  onClick={() => {
                    if (isPlayerTurn) onToggleCard(card.id);
                  }}
                  disabled={!isPlayerTurn}
                />
                {/* 主牌角标 */}
                {isTrump && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[8px] font-bold leading-none text-amber-900 bg-amber-400 border border-amber-500 shadow-sm"
                    style={{ width: 16, height: 16 }}
                  >
                    主
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 其他玩家的牌背叠放 */
function OpponentCardBacks({
  count,
  variant,
}: {
  count: number;
  variant: "top" | "left" | "right";
}) {
  const showCount = Math.min(Math.max(Math.min(count, 5), 5), 8);
  const remaining = count - showCount;

  if (variant === "top") {
    return (
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: showCount }).map((_, i) => (
          <PokerCardBack key={i} size="sm" />
        ))}
        {remaining > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            剩余 {count} 张
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {Array.from({ length: showCount }).map((_, i) => (
        <PokerCardBack key={i} size="sm" />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground mt-0.5">
          剩余 {count} 张
        </span>
      )}
    </div>
  );
}

export function TractorGame({ onBack }: TractorGameProps) {
  const [state, setState] = useState<TractorState>(createTractorInitialState);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elderlyMode = false;

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
        const action = aiTractorBidDecision(state);
        setState((prev) => doTractorBid(prev, action));
        if (action.type === "bid") {
          setMessage(
            `${getTractorPlayerName(state.currentPlayer, true)} 亮主 ${getTrumpSuitName(action.suit)}`
          );
        } else {
          setMessage(
            `${getTractorPlayerName(state.currentPlayer, true)} 不亮主`
          );
        }
      }, 1000);
    } else if (state.phase === "playing" && state.players[state.currentPlayer].isAI) {
      timerRef.current = setTimeout(() => {
        const action = aiTractorPlayDecision(state);
        setState((prev) => {
          const newState = doTractorPlay(prev, action);
          if (action.type === "pass") {
            setMessage(
              `${getTractorPlayerName(prev.currentPlayer, true)} 不出`
            );
          } else {
            const pattern = detectTractorPattern(action.cards, prev.trumpSuit, prev.currentLevel);
            setMessage(
              `${getTractorPlayerName(prev.currentPlayer, true)} 出了 ${pattern ? tractorHandTypeName(pattern.type) : ""}`
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

  // 玩家亮主
  const handleBid = useCallback((suit: TrumpSuit) => {
    const level = state.currentLevel;
    const bidCard = state.players[0].hand.find((c) =>
      suit === "none" ? c.rank === level : c.suit === suit && c.rank === level
    );
    if (!bidCard && suit !== "none") {
      setMessage("手牌中没有该花色的级牌");
      return;
    }
    const action: TractorBidAction = { type: "bid", suit, cards: bidCard ? [bidCard] : [] };
    setState((prev) => doTractorBid(prev, action));
    setMessage(`您亮主 ${getTrumpSuitName(suit)}`);
  }, [state.currentLevel, state.players]);

  const handlePassBid = useCallback(() => {
    const action: TractorBidAction = { type: "pass" };
    setState((prev) => doTractorBid(prev, action));
    setMessage("您选择不亮主");
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
  const getSelectedCards = useCallback(() => {
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
    if (!canPlayTractorBeat(cards, state.currentPlay, state.trumpSuit, state.currentLevel)) {
      setMessage("出牌不符合规则或管不上");
      return;
    }
    const action: TractorPlayAction = { type: "play", cards };
    setState((prev) => doTractorPlay(prev, action));
    setSelectedCards(new Set());
    const pattern = detectTractorPattern(cards, state.trumpSuit, state.currentLevel);
    setMessage(`您出了 ${pattern ? tractorHandTypeName(pattern.type) : ""}`);
  }, [getSelectedCards, state.currentPlay, state.trumpSuit, state.currentLevel]);

  // 玩家不出
  const handlePass = useCallback(() => {
    if (
      state.currentPlay === null ||
      state.currentPlayPlayer === 0
    ) {
      setMessage("您是首家，必须出牌");
      return;
    }
    const action: TractorPlayAction = { type: "pass" };
    setState((prev) => doTractorPlay(prev, action));
    setSelectedCards(new Set());
    setMessage("您选择不出");
  }, [state.currentPlay, state.currentPlayPlayer]);

  // 提示
  const handleHint = useCallback(() => {
    const hand = state.players[0].hand;
    const suggestion = suggestTractorPlay(hand, state.currentPlay, state.trumpSuit, state.currentLevel);
    if (!suggestion) {
      setMessage("没有牌能管上，建议不出");
      return;
    }
    const ids = new Set(suggestion.map((c) => c.id));
    setSelectedCards(ids);
    setMessage("已为您推荐出牌");
  }, [state.players, state.currentPlay, state.trumpSuit, state.currentLevel]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setState(createTractorInitialState());
    setSelectedCards(new Set());
    setMessage("");
    setShowResult(false);
  }, []);

  // 当前玩家
  const isPlayerTurn =
    state.phase === "playing" && state.currentPlayer === 0 && !state.players[0].isAI;

  // 渲染玩家头像区域
  const renderPlayerInfo = (index: TractorPlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && (state.phase === "playing" || state.phase === "bidding");
    const isTeammate = getTractorTeammate(0) === index;
    const isOpponent = !isTeammate && index !== 0;

    return (
      <div className={cn("flex flex-col items-center gap-1")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-1.5 border-2",
            isCurrent
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-border bg-card"
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0",
              isTeammate
                ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                : isOpponent
                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            )}
          >
            {index === 0 ? "我" : isTeammate ? "友" : "敌"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm leading-tight truncate">
              {getTractorPlayerName(index, player.isAI)}
            </span>
            <span className="text-xs text-muted-foreground">
              {player.hand.length}张
            </span>
          </div>
        </div>
        {isCurrent && (
          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 animate-pulse">
            {state.phase === "bidding" ? "亮主中..." : "回合中..."}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* 顶部信息栏 */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 bg-background/80 border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xl hover:scale-110 transition-transform"
              aria-label="返回"
            >
              &larr;
            </button>
          )}
          <div>
            <h1 className="text-base font-bold leading-tight">拖拉机</h1>
            <span className="text-xs text-muted-foreground">
              {state.phase === "bidding"
                ? "亮主阶段"
                : state.phase === "playing"
                ? `主牌: ${getTrumpSuitName(state.trumpSuit)} | 级牌: ${state.currentLevel}`
                : "游戏结束"}
            </span>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          我方: 玩家+{getTractorPlayerName(2, true)}
        </span>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className="shrink-0 px-4 py-1 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-medium">
            {message}
          </span>
        </div>
      )}

      {/* 游戏主区域 */}
      <main className="flex-1 flex flex-col min-h-0 px-2 gap-1 overflow-hidden">
        {/* 上方：对家 */}
        <div className="shrink-0 flex justify-center items-start pt-1">
          {renderPlayerInfo(2)}
          <div className="mt-1">
            <OpponentCardBacks count={state.players[2].hand.length} variant="top" />
          </div>
        </div>

        {/* 中间行：左对手 + 出牌区 + 右对手 */}
        <div className="flex-1 flex justify-between items-center min-h-0 px-1 overflow-hidden">
          {/* 左侧玩家 */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            {renderPlayerInfo(3)}
            <OpponentCardBacks count={state.players[3].hand.length} variant="left" />
          </div>

          {/* 中间：出牌区 */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2">
            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {getTractorPlayerName(state.currentPlayPlayer, state.players[state.currentPlayPlayer].isAI)} 出牌
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {state.currentPlay.cards.map((card) => (
                    <PokerCardComponent
                      key={card.id}
                      card={card}
                      size="sm"
                      disabled
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {tractorHandTypeName(state.currentPlay.type)}
                </span>
              </div>
            )}
            {!state.currentPlay && state.phase === "playing" && (
              <div className="text-xs text-muted-foreground mt-2">
                新一轮开始，请出牌
              </div>
            )}
          </div>

          {/* 右侧玩家 */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            {renderPlayerInfo(1)}
            <OpponentCardBacks count={state.players[1].hand.length} variant="right" />
          </div>
        </div>

        {/* 亮主界面 */}
        {state.phase === "bidding" && state.currentPlayer === 0 && (
          <div className="shrink-0 flex flex-col items-center gap-2 py-2">
            <p className="text-sm font-bold">轮到您亮主</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {(["spade", "heart", "club", "diamond", "none"] as TrumpSuit[]).map((suit) => (
                <Button
                  key={suit}
                  onClick={() => handleBid(suit)}
                  size="sm"
                  className="h-9 px-3 text-sm font-bold"
                >
                  {getTrumpSuitName(suit)}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={handlePassBid}
                size="sm"
                className="h-9 px-4 text-sm font-bold"
              >
                不亮
              </Button>
            </div>
          </div>
        )}

        {/* 底牌显示（亮主结束后短暂显示） */}
        {state.phase === "playing" && state.bottomCards.length > 0 && !state.bottomSettled && (
          <div className="shrink-0 flex justify-center gap-1.5 py-1">
            <span className="text-xs text-muted-foreground">底牌:</span>
            {state.bottomCards.map((card) => (
              <PokerCardComponent key={card.id} card={card} size="sm" disabled />
            ))}
          </div>
        )}

        {/* 操作按钮 - 始终在手牌上方 */}
        {state.phase === "playing" && (
          <div className="shrink-0 flex justify-center gap-2 py-1">
            <Button
              onClick={handleHint}
              variant="secondary"
              size="sm"
              className="h-10 px-4 text-sm font-bold"
            >
              提示
            </Button>
            <Button
              onClick={handlePass}
              variant="outline"
              size="sm"
              disabled={!isPlayerTurn || state.currentPlay === null || state.currentPlayPlayer === 0}
              className="h-10 px-4 text-sm font-bold"
            >
              不出
            </Button>
            <Button
              onClick={handlePlay}
              size="sm"
              disabled={!isPlayerTurn || selectedCards.size === 0}
              className="h-10 px-4 text-sm font-bold"
            >
              出牌
            </Button>
          </div>
        )}

        {/* 玩家手牌区 */}
        <div className="shrink-0 flex flex-col gap-0.5 pb-1">
          {renderPlayerInfo(0)}
          <OverlappingHand
            cards={state.players[0].hand}
            selectedCards={selectedCards}
            isPlayerTurn={isPlayerTurn}
            onToggleCard={toggleCard}
            trumpSuit={state.trumpSuit}
            currentLevel={state.currentLevel}
          />
        </div>
      </main>

      {/* 游戏结束弹窗 */}
      {showResult && state.phase === "finished" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              {state.winner === 0 || state.winner === 2 ? "我方赢了！" : "我方输了"}
            </h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-lg">
                <span>赢家:</span>
                <span className="font-bold">
                  {state.winner !== null
                    ? getTractorPlayerName(state.winner, state.players[state.winner].isAI)
                    : ""}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span>获胜方:</span>
                <span className="font-bold">
                  {state.winningTeam === 0 ? "我方（玩家+对家）" : "对方（左方+右方）"}
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-border">
                <span>主牌:</span>
                <span className="font-bold">{getTrumpSuitName(state.trumpSuit)}</span>
              </div>
              <div className="flex justify-between text-base">
                <span>级牌:</span>
                <span className="font-bold">{state.currentLevel}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRestart}
                className="flex-1 h-12 text-base font-bold"
              >
                再来一局
              </Button>
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 h-12 text-base font-bold"
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
