"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type PokerCard as PokerCardType,
  type HandPattern,
  detectHandPattern,
  canPlayBeat,
  suggestPlay,
  getCardValue,
} from "@/lib/games/poker";
import {
  type GuandanState,
  type PlayerIndex,
  type GuandanPlayAction,
  createGuandanInitialState,
  createGuandanNextRoundState,
  doGuandanPlay,
  aiGuandanPlayDecision,
  getGuandanPlayerName,
  getTeammate,
  guandanHandTypeName,
  detectGuandanPattern,
  canPlayGuandanBeat,
  suggestGuandanPlay,
  type RankDisplay,
  doTribute,
  doReturnTribute,
  aiTributeDecision,
  aiReturnTributeDecision,
} from "@/lib/games/guandan";
import { PokerCard as PokerCardComponent, PokerCardBack } from "./poker-card";
import { GameResultModal } from "@/components/game-result-modal";

interface GuandanGameProps {
  onBack?: () => void;
}

const CARD_WIDTH_CSS = "clamp(40px, 8vw, 60px)";

/** 手牌重叠布局 */
function OverlappingHand({
  cards,
  selectedCards,
  isPlayerTurn,
  onToggleCard,
  currentLevel,
}: {
  cards: PokerCardType[];
  selectedCards: Set<string>;
  isPlayerTurn: boolean;
  onToggleCard: (cardId: string) => void;
  currentLevel: RankDisplay;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);
  const [cardWidth, setCardWidth] = useState(50);

  useEffect(() => {
    const update = () => {
      const vw = typeof window !== "undefined" ? window.innerWidth : 375;
      setCardWidth(Math.min(Math.max(vw * 0.08, 40), 60));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  // 计算重叠步长
  const step = useMemo(() => {
    const paddingX = 8;
    const availableWidth = containerWidth - paddingX;
    const cardCount = cards.length;
    if (cardCount <= 1) return cardWidth;
    const naturalWidth = cardWidth * cardCount;
    let s = cardWidth;
    if (naturalWidth > availableWidth) {
      s = (availableWidth - cardWidth) / (cardCount - 1);
    }
    return Math.max(s, cardWidth * 0.22);
  }, [cards.length, cardWidth, containerWidth]);

  // 判断是否为级牌
  const isLevelCard = useCallback(
    (card: PokerCardType) => card.rank === currentLevel,
    [currentLevel]
  );

  // 判断是否为逢人配（红桃级牌）
  const isFengRenPei = useCallback(
    (card: PokerCardType) =>
      card.rank === currentLevel && card.suit === "heart",
    [currentLevel]
  );

  const containerHeight = cardWidth * 1.5 + 16;

  return (
    <div
      ref={containerRef}
      className="relative flex items-end justify-center w-full"
      style={{ height: containerHeight }}
    >
      <div
        className="relative"
        style={{
          width: step * (cards.length - 1) + cardWidth,
          height: containerHeight,
        }}
      >
        {cards.map((card, idx) => {
          const isSelected = selectedCards.has(card.id);
          const isLevel = isLevelCard(card);
          const isFRP = isFengRenPei(card);
          return (
            <div
              key={card.id}
              className="absolute top-0"
              style={{
                left: idx * step,
                zIndex: idx + (isSelected ? 100 : 0),
                transform: isSelected ? "translateY(-12px)" : "translateY(0)",
                transition: "transform 0.15s ease",
                filter: isSelected
                  ? "drop-shadow(0 8px 6px rgba(0,0,0,0.35))"
                  : "none",
              }}
            >
              <div
                className={cn(
                  "rounded-md transition-shadow",
                  isLevel &&
                    "ring-2 ring-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]"
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
                  style={{ width: CARD_WIDTH_CSS }}
                />
                {/* 级牌金色角标 */}
                {isLevel && !isFRP && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[8px] font-bold leading-none text-yellow-900 bg-yellow-400 border border-yellow-500 shadow-sm"
                    style={{ width: 16, height: 16 }}
                  >
                    级
                  </span>
                )}
                {/* 逢人配金色星标 */}
                {isFRP && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold leading-none text-yellow-900 bg-yellow-300 border border-yellow-400 shadow-sm"
                    style={{ width: 16, height: 16 }}
                  >
                    ★
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

/** 玩家信息头像 */
function PlayerInfo({
  index,
  state,
}: {
  index: PlayerIndex;
  state: GuandanState;
}) {
  const player = state.players[index];
  const isCurrent = state.currentPlayer === index &&
    (state.phase === "playing" || state.phase === "tribute" || state.phase === "return-tribute");
  const isTeammate = getTeammate(0) === index;
  const isSelf = index === 0;
  const isOpponent = !isTeammate && !isSelf;

  const borderColor = isTeammate || isSelf ? "#3B82F6" : "#EF4444";
  const bgColor = isTeammate || isSelf ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)";
  const textColor = isTeammate || isSelf ? "#93C5FD" : "#FCA5A5";
  const label = isSelf ? "我" : isTeammate ? "友" : "敌";

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      <div
        className={cn(
          "flex items-center justify-center rounded-full font-bold text-sm shrink-0 border-2",
          isCurrent && "animate-pulse"
        )}
        style={{
          width: 40,
          height: 40,
          backgroundColor: bgColor,
          borderColor: isCurrent ? "#FACC15" : borderColor,
          color: textColor,
          boxShadow: isCurrent ? "0 0 8px rgba(250,204,21,0.5)" : "none",
        }}
      >
        {label}
      </div>
      <span className="text-[11px] text-white/90 font-medium whitespace-nowrap leading-tight">
        {getGuandanPlayerName(index, player.isAI)}
      </span>
      <span className="text-[10px] text-white/60">
        {player.hand.length}张
      </span>
      {isTeammate && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full text-[9px] font-bold bg-blue-500 text-white whitespace-nowrap">
          队友
        </span>
      )}
      {isCurrent && state.phase === "playing" && (
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-yellow-300 whitespace-nowrap">
          回合中
        </span>
      )}
    </div>
  );
}

export function GuandanGame({ onBack }: GuandanGameProps) {
  const [state, setState] = useState<GuandanState>(createGuandanInitialState);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [round, setRound] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elderlyMode = false;

  // 清除定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 阶段变化时清除选牌
  useEffect(() => {
    if (state.phase === "tribute" || state.phase === "return-tribute") {
      setSelectedCards(new Set());
    }
  }, [state.phase, state.currentPlayer]);

  // AI 回合处理（出牌/进贡/还贡）
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (state.phase === "playing" && state.players[state.currentPlayer].isAI) {
      timerRef.current = setTimeout(() => {
        const action = aiGuandanPlayDecision(state);
        setState((prev) => {
          const newState = doGuandanPlay(prev, action);
          if (action.type === "pass") {
            setMessage(
              `${getGuandanPlayerName(prev.currentPlayer, true)} 不出`
            );
          } else {
            const pattern = detectGuandanPattern(action.cards, prev.currentLevel);
            setMessage(
              `${getGuandanPlayerName(prev.currentPlayer, true)} 出了 ${pattern ? guandanHandTypeName(pattern.type) : ""}`
            );
          }
          return newState;
        });
      }, elderlyMode ? 2000 : 1200);
    } else if (state.phase === "tribute" && state.players[state.currentPlayer].isAI) {
      timerRef.current = setTimeout(() => {
        const card = aiTributeDecision(state.players[state.currentPlayer].hand, state.currentLevel);
        setState((prev) => doTribute(prev, card));
        setMessage(`${getGuandanPlayerName(state.currentPlayer, true)} 已进贡`);
      }, 1000);
    } else if (state.phase === "return-tribute" && state.players[state.currentPlayer].isAI) {
      timerRef.current = setTimeout(() => {
        const card = aiReturnTributeDecision(state.players[state.currentPlayer].hand, state.currentLevel);
        setState((prev) => doReturnTribute(prev, card));
        setMessage(`${getGuandanPlayerName(state.currentPlayer, true)} 已还贡`);
      }, 1000);
    } else if (state.phase === "finished" && !showResult) {
      timerRef.current = setTimeout(() => {
        setShowResult(true);
      }, 800);
    }
  }, [state, elderlyMode, showResult]);

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

  // 进贡/还贡选牌（单选）
  const selectSingleCard = useCallback((cardId: string) => {
    setSelectedCards(new Set([cardId]));
  }, []);

  // 获取当前选中的牌
  const getSelectedCards = useCallback((): PokerCardType[] => {
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
    if (!canPlayGuandanBeat(cards, state.currentPlay, state.currentLevel)) {
      setMessage("出牌不符合规则或管不上");
      return;
    }
    const action: GuandanPlayAction = { type: "play", cards };
    setState((prev) => doGuandanPlay(prev, action));
    setSelectedCards(new Set());
    const pattern = detectGuandanPattern(cards, state.currentLevel);
    setMessage(`您出了 ${pattern ? guandanHandTypeName(pattern.type) : ""}`);
  }, [getSelectedCards, state.currentPlay, state.currentLevel]);

  // 玩家不出
  const handlePass = useCallback(() => {
    if (
      state.currentPlay === null ||
      state.currentPlayPlayer === 0
    ) {
      setMessage("您是首家，必须出牌");
      return;
    }
    const action: GuandanPlayAction = { type: "pass" };
    setState((prev) => doGuandanPlay(prev, action));
    setSelectedCards(new Set());
    setMessage("您选择不出");
  }, [state.currentPlay, state.currentPlayPlayer]);

  // 提示
  const handleHint = useCallback(() => {
    const hand = state.players[0].hand;
    const suggestion = suggestGuandanPlay(hand, state.currentPlay, state.currentLevel);
    if (!suggestion) {
      setMessage("没有牌能管上，建议不出");
      return;
    }
    const ids = new Set(suggestion.map((c) => c.id));
    setSelectedCards(ids);
    setMessage("已为您推荐出牌");
  }, [state.players, state.currentPlay, state.currentLevel]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setState((prev) => createGuandanNextRoundState(prev));
    setSelectedCards(new Set());
    setMessage("");
    setShowResult(false);
    setRound((r) => r + 1);
  }, []);

  // 确认进贡
  const handleConfirmTribute = useCallback(() => {
    const cards = getSelectedCards();
    if (cards.length !== 1) {
      setMessage("请选择一张牌进贡");
      return;
    }
    setState((prev) => doTribute(prev, cards[0]));
    setSelectedCards(new Set());
    setMessage("您已完成进贡");
  }, [getSelectedCards]);

  // 确认还贡
  const handleConfirmReturnTribute = useCallback(() => {
    const cards = getSelectedCards();
    if (cards.length !== 1) {
      setMessage("请选择一张牌还贡");
      return;
    }
    setState((prev) => doReturnTribute(prev, cards[0]));
    setSelectedCards(new Set());
    setMessage("您已完成还贡");
  }, [getSelectedCards]);

  // 当前玩家是否可操作
  const isPlayerTurn =
    state.phase === "playing" && state.currentPlayer === 0 && !state.players[0].isAI;

  const isPlayerTributeTurn =
    state.phase === "tribute" && state.currentPlayer === 0;

  const isPlayerReturnTributeTurn =
    state.phase === "return-tribute" && state.currentPlayer === 0;

  // 游戏结果
  const gameResult = state.phase === "finished" && state.winningTeam !== null
    ? state.winningTeam === 0 ? "win" : "lose"
    : null;

  return (
    <div
      className="w-full flex flex-col overflow-hidden select-none"
      style={{ height: "100dvh", background: "#1B5E20" }}
    >
      {/* 顶部状态栏 */}
      <header
        className="shrink-0 flex items-center justify-between px-4 py-2 text-white"
        style={{ background: "#145A18" }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-lg hover:scale-110 transition-transform"
              aria-label="返回"
            >
              &larr;
            </button>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-90">房间: 001</span>
            <span className="opacity-50">|</span>
            <span className="opacity-90">第 {round} 局</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-yellow-300">
            本局级牌：{state.currentLevel}
          </span>
        </div>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className="shrink-0 px-4 py-1 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-black/30 text-white text-xs font-medium backdrop-blur-sm">
            {message}
          </span>
        </div>
      )}

      {/* 牌桌主区域 */}
      <div
        className="flex-1 relative mx-3 mb-3 rounded-xl border-[6px] overflow-hidden flex flex-col"
        style={{
          borderColor: "#8B6914",
          background: "#1B5E20",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.25), 0 0 0 2px #6B4F0F",
        }}
      >
        {/* 上方：对家 */}
        <div className="shrink-0 flex justify-center pt-2">
          <PlayerInfo index={2} state={state} />
        </div>

        {/* 中间行：左对手 + 出牌区 + 右对手 */}
        <div className="flex-1 flex min-h-0">
          {/* 左侧玩家 */}
          <div className="shrink-0 flex flex-col justify-center pl-2">
            <PlayerInfo index={3} state={state} />
          </div>

          {/* 中间：出牌区 */}
          <div className="flex-1 relative min-h-0">
            {/* 各座位出牌位置 */}
            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div
                className={cn(
                  "absolute flex flex-col items-center gap-1 transition-all duration-300"
                )}
                style={{
                  ...(state.currentPlayPlayer === 0 && { bottom: "8%", left: "50%", transform: "translateX(-50%)" }),
                  ...(state.currentPlayPlayer === 1 && { right: "8%", top: "50%", transform: "translateY(-50%)" }),
                  ...(state.currentPlayPlayer === 2 && { top: "8%", left: "50%", transform: "translateX(-50%)" }),
                  ...(state.currentPlayPlayer === 3 && { left: "8%", top: "50%", transform: "translateY(-50%)" }),
                }}
              >
                <div className="flex gap-0.5">
                  {state.currentPlay.cards.map((card) => (
                    <PokerCardComponent
                      key={card.id}
                      card={card}
                      size="sm"
                      disabled
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/80 font-medium whitespace-nowrap">
                  {guandanHandTypeName(state.currentPlay.type)}
                </span>
              </div>
            )}

            {!state.currentPlay && state.phase === "playing" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/50 text-sm">
                  新一轮开始，请出牌
                </span>
              </div>
            )}
          </div>

          {/* 右侧玩家 */}
          <div className="shrink-0 flex flex-col justify-center pr-2">
            <PlayerInfo index={1} state={state} />
          </div>
        </div>

        {/* 底部区域：按钮 + 玩家信息 + 手牌 */}
        <div className="shrink-0 px-3 pb-2">
          {/* 操作按钮 - 手牌上方偏右 */}
          {state.phase === "playing" && (
            <div className="flex justify-end gap-2 mb-1">
              <Button
                onClick={handleHint}
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs font-bold bg-white/90 hover:bg-white text-gray-800"
              >
                提示
              </Button>
              <Button
                onClick={handlePass}
                variant="outline"
                size="sm"
                disabled={!isPlayerTurn || state.currentPlay === null || state.currentPlayPlayer === 0}
                className="h-7 px-3 text-xs font-bold bg-white/80 hover:bg-white text-gray-800 border-white/40"
              >
                不出
              </Button>
              <Button
                onClick={handlePlay}
                size="sm"
                disabled={!isPlayerTurn || selectedCards.size === 0}
                className="h-7 px-3 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white"
              >
                出牌
              </Button>
            </div>
          )}

          {/* 自己信息 + 手牌 */}
          <div className="flex items-end justify-center gap-2">
            {/* 自己头像 */}
            <div className="shrink-0 flex flex-col items-center gap-0.5 mb-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2"
                style={{
                  backgroundColor: "rgba(59,130,246,0.25)",
                  borderColor: "#3B82F6",
                  color: "#93C5FD",
                }}
              >
                我
              </div>
              <span className="text-[10px] text-white/70">
                {state.players[0].hand.length}张
              </span>
            </div>

            {/* 手牌 */}
            {state.phase === "playing" && (
              <OverlappingHand
                cards={state.players[0].hand}
                selectedCards={selectedCards}
                isPlayerTurn={isPlayerTurn}
                onToggleCard={toggleCard}
                currentLevel={state.currentLevel}
              />
            )}
          </div>
        </div>

        {/* 进贡/还贡中央面板 */}
        {(state.phase === "tribute" || state.phase === "return-tribute") && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="bg-white rounded-xl p-4 max-w-lg w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-center text-gray-800 mb-1">
                {state.phase === "tribute" ? "请选择一张牌进贡" : "请选择一张牌还贡"}
              </h3>
              <p className="text-xs text-gray-500 text-center mb-3">
                {state.phase === "tribute"
                  ? "请从手牌中选择一张牌进贡给对方"
                  : "请从手牌中选择一张牌还给对方"}
              </p>

              {state.currentPlayer === 0 ? (
                <>
                  {/* 手牌选择区 */}
                  <div className="overflow-x-auto pb-2 mb-3">
                    <div className="flex gap-1 min-w-max px-1 justify-center">
                      {state.players[0].hand.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => selectSingleCard(card.id)}
                          className={cn(
                            "shrink-0 rounded-md border-2 transition-all",
                            selectedCards.has(card.id)
                              ? "border-yellow-400 -translate-y-2 shadow-lg"
                              : "border-transparent hover:border-gray-300"
                          )}
                        >
                          <PokerCardComponent
                            card={card}
                            size="sm"
                            style={{ width: "clamp(36px, 6vw, 48px)" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={state.phase === "tribute" ? handleConfirmTribute : handleConfirmReturnTribute}
                    disabled={selectedCards.size !== 1}
                    className="w-full h-10 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {state.phase === "tribute" ? "确认进贡" : "确认还贡"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm text-gray-600">
                    等待 {getGuandanPlayerName(state.currentPlayer, state.players[state.currentPlayer].isAI)} 操作...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 游戏结束弹窗 - 使用 GameResultModal */}
      {gameResult && (
        <GameResultModal
          result={gameResult}
          message={
            state.winningTeam === 0
              ? `恭喜！${getGuandanPlayerName(state.winner!, state.players[state.winner!].isAI)} 率先出完牌`
              : "对方先出完牌，再接再厉"
          }
          onRestart={handleRestart}
          onBack={() => {
            if (onBack) onBack();
          }}
        />
      )}
    </div>
  );
}
