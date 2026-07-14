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
  doTractorSetBottom,
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
  sortTractorCards,
  getFollowHint,
  getTractorCardValue,
} from "@/lib/games/tractor";
import { PokerCard as PokerCardComponent, PokerCardBack } from "./poker-card";
import { type PokerCard as PokerCardType, type Suit } from "@/lib/games/poker";
import { GameResultModal } from "@/components/game-result-modal";

interface TractorGameProps {
  onBack?: () => void;
}

/** 手牌排序：主牌 > 黑桃 > 红桃 > 梅花 > 方块（同花色从大到小） */
function sortHandForDisplay(
  cards: PokerCardType[],
  trumpSuit: TrumpSuit,
  level: RankDisplay
): PokerCardType[] {
  return [...cards].sort((a, b) => {
    const aTrump = isTrumpCard(a, trumpSuit, level);
    const bTrump = isTrumpCard(b, trumpSuit, level);
    if (aTrump && !bTrump) return -1;
    if (!aTrump && bTrump) return 1;
    if (aTrump && bTrump) {
      return getTractorCardValue(b, trumpSuit, level) - getTractorCardValue(a, trumpSuit, level);
    }
    const suitOrder: Record<Suit, number> = { spade: 0, heart: 1, club: 2, diamond: 3 };
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return getTractorCardValue(b, trumpSuit, level) - getTractorCardValue(a, trumpSuit, level);
  });
}

/** 手牌重叠布局 */
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

  const cardWidth = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 375;
    const w = Math.min(Math.max(Math.floor(vw * 0.065), 40), 60);
    return w;
  }, []);

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
      style={{ height: cardWidth * 1.45 + 8 }}
    >
      <div
        className="relative"
        style={{
          width: step * (cards.length - 1) + cardWidth,
          height: cardWidth * 1.45 + 8,
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
                  "rounded-md transition-shadow relative",
                  isTrump &&
                    "ring-[3px] ring-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
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
                {isTrump && (
                  <span
                    className="absolute -top-2 -right-2 flex items-center justify-center rounded-full text-[9px] font-bold leading-none text-amber-900 bg-amber-400 border border-amber-500 shadow-sm"
                    style={{ width: 18, height: 18 }}
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

/** 对手牌背 */
function OpponentHand({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-center">
      <PokerCardBack count={count} size="sm" />
    </div>
  );
}

export function TractorGame({ onBack }: TractorGameProps) {
  const [state, setState] = useState<TractorState>(createTractorInitialState);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bottomSelectedCards, setBottomSelectedCards] = useState<Set<string>>(new Set());
  const [displayRoundPlays, setDisplayRoundPlays] = useState<{ player: TractorPlayerIndex; cards: PokerCardType[] }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevBidInfoRef = useRef(state.bidInfo);
  const elderlyMode = false;

  // 清除定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Toast 提示
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 1500);
  }, []);

  // 反主检测
  useEffect(() => {
    const prev = prevBidInfoRef.current;
    if (
      prev.player !== null &&
      state.bidInfo.player !== null &&
      prev.player !== state.bidInfo.player &&
      state.phase === "bidding"
    ) {
      const name = getTractorPlayerName(state.bidInfo.player, state.players[state.bidInfo.player].isAI);
      showToast(`${name} 反主`);
    }
    prevBidInfoRef.current = state.bidInfo;
  }, [state.bidInfo, state.phase, state.players, showToast]);

  // 更新显示轮次出牌
  useEffect(() => {
    if (state.roundPlays.length > 0) {
      setDisplayRoundPlays(state.roundPlays);
    }
  }, [state.roundPlays]);

  // AI 回合处理
  useEffect(() => {
    // 扣底阶段
    if (state.phase === "playing" && !state.bottomSettled) {
      timerRef.current = setTimeout(() => {
        if (state.players[state.dealer].isAI) {
          const hand = state.players[state.dealer].hand;
          const sorted = sortTractorCards([...hand], state.trumpSuit, state.currentLevel);
          const bottomCards = sorted.slice(0, 8);
          setState((prev) => doTractorSetBottom(prev, bottomCards));
        }
      }, 1000);
      return;
    }

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
    const validation = canPlayTractorBeat(cards, state.currentPlay, state.trumpSuit, state.currentLevel);
    if (!validation) {
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
    setBottomSelectedCards(new Set());
    setDisplayRoundPlays([]);
    prevBidInfoRef.current = { player: null, suit: "none", rank: "2" };
  }, []);

  // 扣底选牌
  const toggleBottomCard = useCallback((cardId: string) => {
    setBottomSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else if (next.size < state.bottomCards.length) {
        next.add(cardId);
      }
      return next;
    });
  }, [state.bottomCards.length]);

  // 确认扣底
  const handleConfirmBottom = useCallback(() => {
    const cards = state.players[0].hand.filter((c) => bottomSelectedCards.has(c.id));
    if (cards.length !== state.bottomCards.length) {
      setMessage(`请选择 ${state.bottomCards.length} 张牌扣底`);
      return;
    }
    setState((prev) => doTractorSetBottom(prev, cards));
    setBottomSelectedCards(new Set());
    setMessage("扣底完成");
  }, [state.players, state.bottomCards.length, bottomSelectedCards]);

  // 当前玩家回合判断
  const isPlayerTurn =
    state.phase === "playing" && state.currentPlayer === 0 && !state.players[0].isAI && state.bottomSettled;

  // 排序后的手牌
  const displayHand = useMemo(
    () => sortHandForDisplay(state.players[0].hand, state.trumpSuit, state.currentLevel),
    [state.players[0].hand, state.trumpSuit, state.currentLevel]
  );

  // 跟牌提示
  const followHint = useMemo(() => {
    if (state.phase !== "playing" || !state.bottomSettled) return null;
    return getFollowHint(
      state.players[0].hand,
      state.roundLeadSuit,
      state.trumpSuit,
      state.currentLevel,
      state.currentPlay
    );
  }, [state]);

  // 闲家得分（简化：对家=队友得分，对手=对方得分）
  const opponentScore = useMemo(() => {
    return state.players[1].score + state.players[3].score;
  }, [state.players]);

  // 渲染玩家信息
  const renderPlayerInfo = (index: TractorPlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && (state.phase === "playing" || state.phase === "bidding");
    const isTeammate = getTractorTeammate(0) === index;
    const isOpponent = !isTeammate && index !== 0;
    const isDealer = state.dealer === index;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 border-2",
            isCurrent
              ? "border-yellow-400 bg-yellow-900/40 text-white"
              : "border-white/20 bg-black/30 text-white"
          )}
        >
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
              isTeammate
                ? "bg-green-500/80 text-white"
                : isOpponent
                ? "bg-red-500/80 text-white"
                : "bg-blue-500/80 text-white"
            )}
          >
            {index === 0 ? "我" : isTeammate ? "友" : "敌"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs leading-tight truncate text-white">
              {getTractorPlayerName(index, player.isAI)}
              {isDealer && (
                <span className="ml-1 text-[10px] text-yellow-300">庄</span>
              )}
            </span>
            <span className="text-[10px] text-white/70">{player.hand.length}张</span>
          </div>
        </div>
        {isCurrent && (
          <span className="text-[10px] font-bold text-yellow-300 animate-pulse">
            {state.phase === "bidding"
              ? "亮主中..."
              : state.phase === "playing" && !state.bottomSettled
              ? "扣底中..."
              : "回合中..."}
          </span>
        )}
      </div>
    );
  };

  // 渲染中央某玩家的出牌
  const renderPlayedCards = (playerIndex: TractorPlayerIndex) => {
    const play = displayRoundPlays.find((p) => p.player === playerIndex);
    if (!play || play.cards.length === 0) return null;
    const isHorizontal = playerIndex === 0 || playerIndex === 2;
    return (
      <div className={cn("flex gap-0.5", isHorizontal ? "flex-row" : "flex-col")}>
        {play.cards.map((card) => (
          <PokerCardComponent key={card.id} card={card} size="sm" disabled />
        ))}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-[100dvh] w-full overflow-hidden"
      style={{ background: "#1B5E20", border: "6px solid #8D6E63" }}
    >
      {/* 顶部状态栏 */}
      <header className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-black/20 border-b border-[#8D6E63]/50">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="text-lg hover:scale-110 transition-transform text-white/90"
              aria-label="返回"
            >
              &larr;
            </button>
          )}
          <h1 className="text-sm font-bold text-white/90">拖拉机</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/90">
          <span>等级：{state.currentLevel}</span>
          <span>主牌：{getTrumpSuitName(state.trumpSuit)}</span>
          <span>庄家：{getTractorPlayerName(state.dealer, state.players[state.dealer].isAI)}</span>
          <span>闲家得分：{opponentScore}</span>
        </div>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className="shrink-0 px-4 py-1 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-black/40 text-white text-xs font-medium border border-white/10">
            {message}
          </span>
        </div>
      )}

      {/* 主游戏区 */}
      <main className="flex-1 relative min-h-0">
        {/* 队友 - 顶部 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10">
          {renderPlayerInfo(2)}
          <OpponentHand count={state.players[2].hand.length} />
        </div>

        {/* 左对手 */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          {renderPlayerInfo(3)}
          <OpponentHand count={state.players[3].hand.length} />
        </div>

        {/* 右对手 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
          {renderPlayerInfo(1)}
          <OpponentHand count={state.players[1].hand.length} />
        </div>

        {/* 中央出牌区 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-52 h-36 sm:w-60 sm:h-40">
            {/* 队友出牌 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-auto">
              {renderPlayedCards(2)}
            </div>
            {/* 左对手出牌 */}
            <div className="absolute top-1/2 -left-2 -translate-y-1/2 pointer-events-auto">
              {renderPlayedCards(3)}
            </div>
            {/* 右对手出牌 */}
            <div className="absolute top-1/2 -right-2 -translate-y-1/2 pointer-events-auto">
              {renderPlayedCards(1)}
            </div>
            {/* 当前玩家出牌 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
              {renderPlayedCards(0)}
            </div>
          </div>
        </div>

        {/* 当前玩家信息（手牌上方居中） */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          {renderPlayerInfo(0)}
        </div>
      </main>

      {/* 中央面板区域 */}
      <div className="shrink-0 flex flex-col items-center gap-1 z-20">
        {/* 亮主界面 */}
        {state.phase === "bidding" && state.currentPlayer === 0 && (
          <div className="flex flex-col items-center gap-2 py-2 px-2">
            <p className="text-sm font-bold text-white">轮到您亮主</p>
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
                className="h-9 px-4 text-sm font-bold bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                不亮
              </Button>
            </div>
          </div>
        )}

        {/* 扣底面板 */}
        {state.phase === "playing" && !state.bottomSettled && state.dealer === 0 && (
          <div className="flex flex-col items-center gap-2 py-2 px-2 w-full">
            <p className="text-sm font-bold text-white">
              请选择 {state.bottomCards.length} 张牌扣底
            </p>
            <p className="text-xs text-white/80">
              已选择 {bottomSelectedCards.size} / {state.bottomCards.length} 张
            </p>
            <div className="w-full max-w-xl">
              <OverlappingHand
                cards={displayHand}
                selectedCards={bottomSelectedCards}
                isPlayerTurn={true}
                onToggleCard={toggleBottomCard}
                trumpSuit={state.trumpSuit}
                currentLevel={state.currentLevel}
              />
            </div>
            <Button
              onClick={handleConfirmBottom}
              disabled={bottomSelectedCards.size !== state.bottomCards.length}
              size="sm"
              className="h-10 px-6 text-sm font-bold"
            >
              确认扣底
            </Button>
          </div>
        )}

        {/* 跟牌提示 */}
        {followHint?.message && (
          <div className="px-4 py-1">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/80 text-white text-xs font-bold">
              {followHint.message}
            </span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {state.phase === "playing" && state.bottomSettled && (
        <div className="shrink-0 flex justify-center gap-2 py-1 px-2 z-20">
          <Button
            onClick={handleHint}
            variant="secondary"
            size="sm"
            className="h-9 px-4 text-sm font-bold"
          >
            提示
          </Button>
          <Button
            onClick={handlePass}
            variant="outline"
            size="sm"
            disabled={!isPlayerTurn || state.currentPlay === null || state.currentPlayPlayer === 0}
            className="h-9 px-4 text-sm font-bold bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            不出
          </Button>
          <Button
            onClick={handlePlay}
            size="sm"
            disabled={!isPlayerTurn || selectedCards.size === 0}
            className="h-9 px-4 text-sm font-bold"
          >
            出牌
          </Button>
        </div>
      )}

      {/* 玩家手牌区 */}
      {state.phase !== "finished" && (
        <div className="shrink-0 w-full max-w-xl mx-auto pb-1 px-1 z-20">
          <OverlappingHand
            cards={displayHand}
            selectedCards={selectedCards}
            isPlayerTurn={isPlayerTurn}
            onToggleCard={toggleCard}
            trumpSuit={state.trumpSuit}
            currentLevel={state.currentLevel}
          />
        </div>
      )}

      {/* 反主提示 Toast */}
      {toast && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-xl bg-black/70 text-white text-base font-bold animate-bounce">
            {toast}
          </div>
        </div>
      )}

      {/* 游戏结束弹窗 */}
      {showResult && state.phase === "finished" && (
        <GameResultModal
          result={state.winner === 0 || state.winner === 2 ? "win" : "lose"}
          message={`获胜方：${state.winningTeam === 0 ? "我方（玩家+对家）" : "对方（左方+右方）"} | 主牌：${getTrumpSuitName(state.trumpSuit)} | 等级：${state.currentLevel}`}
          onRestart={handleRestart}
          onBack={() => {
            if (onBack) onBack();
          }}
        />
      )}
    </div>
  );
}
