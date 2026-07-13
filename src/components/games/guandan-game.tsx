"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type PokerCard,
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
  doGuandanPlay,
  aiGuandanPlayDecision,
  getGuandanPlayerName,
  getTeammate,
  guandanHandTypeName,
  detectGuandanPattern,
  canPlayGuandanBeat,
  suggestGuandanPlay,
  type RankDisplay,
} from "@/lib/games/guandan";
import { PokerCard as PokerCardComponent, PokerCardBack } from "./poker-card";


interface GuandanGameProps {
  onBack?: () => void;
}

export function GuandanGame({ onBack }: GuandanGameProps) {
  const [state, setState] = useState<GuandanState>(createGuandanInitialState);
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
    setState(createGuandanInitialState());
    setSelectedCards(new Set());
    setMessage("");
    setShowResult(false);
  }, []);

  // 当前玩家
  const isPlayerTurn =
    state.phase === "playing" && state.currentPlayer === 0 && !state.players[0].isAI;

  // 渲染玩家头像区域
  const renderPlayerInfo = (index: PlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && state.phase === "playing";
    const isTeammate = getTeammate(0) === index;
    const isOpponent = !isTeammate && index !== 0;

    return (
      <div className={cn("flex flex-col items-center gap-1")}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 border-2",
            isCurrent
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-border bg-card",
            index === 1 && "flex-row-reverse",
            index === 3 && "flex-row"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold elderly-mode:w-16 elderly-mode:h-16 elderly-mode:text-2xl",
              isTeammate
                ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
                : isOpponent
                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            )}
          >
            {index === 0 ? "我" : isTeammate ? "友" : "敌"}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base elderly-mode:text-xl">
              {getGuandanPlayerName(index, player.isAI)}
            </span>
            <span className="text-sm text-muted-foreground elderly-mode:text-base">
              {player.hand.length}张
            </span>
          </div>
        </div>
        {isCurrent && (
          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 elderly-mode:text-lg animate-pulse">
            回合中...
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 顶部信息栏 */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-background/80 border-b border-border">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-2xl hover:scale-110 transition-transform elderly-mode:text-3xl"
              aria-label="返回"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold elderly-mode:text-2xl">掼蛋</h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              {state.phase === "playing"
                ? `级牌: ${state.currentLevel}`
                : state.phase === "finished"
                ? "游戏结束"
                : "进贡阶段"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 elderly-mode:text-base">
            我方:玩家+{getGuandanPlayerName(2, true)}
          </span>
        </div>
      </header>

      {/* 消息提示 */}
      {message && (
        <div className="shrink-0 px-4 py-2 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-muted text-sm font-medium elderly-mode:text-lg">
            {message}
          </span>
        </div>
      )}

      {/* 游戏主区域 */}
      <main className="flex-1 flex flex-col min-h-0 px-2 py-2 gap-2">
        {/* 上方：对家 */}
        <div className="shrink-0 flex justify-center items-start">
          <div className="flex flex-col items-center gap-2">
            {renderPlayerInfo(2)}
            <div className="flex flex-wrap gap-1 max-w-[200px] justify-center">
              {Array.from({ length: Math.min(state.players[2].hand.length, 10) }).map(
                (_, i) => (
                  <PokerCardBack key={i} size="sm" />
                )
              )}
              {state.players[2].hand.length > 10 && (
                <span className="text-sm text-muted-foreground">+{state.players[2].hand.length - 10}</span>
              )}
            </div>
          </div>
        </div>

        {/* 中间行：左对手 + 出牌区 + 右对手 */}
        <div className="flex-1 flex justify-between items-center min-h-0 px-2">
          {/* 左侧玩家 */}
          <div className="flex flex-col items-center gap-2">
            {renderPlayerInfo(3)}
            <div className="flex flex-wrap gap-1 max-w-[80px] justify-center">
              {Array.from({ length: Math.min(state.players[3].hand.length, 6) }).map(
                (_, i) => (
                  <PokerCardBack key={i} size="sm" />
                )
              )}
              {state.players[3].hand.length > 6 && (
                <span className="text-sm text-muted-foreground">+{state.players[3].hand.length - 6}</span>
              )}
            </div>
          </div>

          {/* 中间：出牌区 */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[120px] px-2">
            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground elderly-mode:text-base">
                  {getGuandanPlayerName(state.currentPlayPlayer, state.players[state.currentPlayPlayer].isAI)} 出牌
                </span>
                <div className="flex flex-wrap justify-center gap-1">
                  {state.currentPlay.cards.map((card) => (
                    <PokerCardComponent
                      key={card.id}
                      card={card}
                      size="md"
                      disabled
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-muted-foreground elderly-mode:text-base">
                  {guandanHandTypeName(state.currentPlay.type)}
                </span>
              </div>
            )}
            {!state.currentPlay && state.phase === "playing" && (
              <div className="text-sm text-muted-foreground elderly-mode:text-base mt-4">
                新一轮开始，请出牌
              </div>
            )}
          </div>

          {/* 右侧玩家 */}
          <div className="flex flex-col items-center gap-2">
            {renderPlayerInfo(1)}
            <div className="flex flex-wrap gap-1 max-w-[80px] justify-center">
              {Array.from({ length: Math.min(state.players[1].hand.length, 6) }).map(
                (_, i) => (
                  <PokerCardBack key={i} size="sm" />
                )
              )}
              {state.players[1].hand.length > 6 && (
                <span className="text-sm text-muted-foreground">+{state.players[1].hand.length - 6}</span>
              )}
            </div>
          </div>
        </div>

        {/* 玩家手牌区 */}
        <div className="shrink-0 flex flex-col gap-2">
          {renderPlayerInfo(0)}

          {/* 手牌 */}
          <div className="flex flex-wrap justify-center gap-1 py-2 px-1">
            {state.players[0].hand.map((card, idx) => {
              const isSelected = selectedCards.has(card.id);
              return (
                <div
                  key={card.id}
                  className={cn(
                    "transition-transform",
                    idx > 0 && "-ml-3 elderly-mode:-ml-1"
                  )}
                  style={{ zIndex: idx }}
                >
                  <PokerCardComponent
                    card={card}
                    selected={isSelected}
                    onClick={() => {
                      if (isPlayerTurn) toggleCard(card.id);
                    }}
                    size="lg"
                    disabled={!isPlayerTurn}
                  />
                </div>
              );
            })}
          </div>

          {/* 操作按钮 */}
          {state.phase === "playing" && isPlayerTurn && (
            <div className="shrink-0 flex justify-center gap-3 py-3">
              <Button
                onClick={handlePlay}
                disabled={selectedCards.size === 0}
                className="h-14 px-6 text-lg font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                出牌
              </Button>
              <Button
                variant="outline"
                onClick={handlePass}
                disabled={
                  state.currentPlay === null || state.currentPlayPlayer === 0
                }
                className="h-14 px-6 text-lg font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                不出
              </Button>
              <Button
                variant="secondary"
                onClick={handleHint}
                className="h-14 px-6 text-lg font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                提示
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* 游戏结束弹窗 */}
      {showResult && state.phase === "finished" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-4 elderly-mode:text-3xl">
              {state.winner === 0 || state.winner === 2 ? "🎉 我方赢了！" : "😢 我方输了"}
            </h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-lg elderly-mode:text-xl">
                <span>赢家:</span>
                <span className="font-bold">
                  {state.winner !== null
                    ? getGuandanPlayerName(state.winner, state.players[state.winner].isAI)
                    : ""}
                </span>
              </div>
              <div className="flex justify-between text-lg elderly-mode:text-xl">
                <span>获胜方:</span>
                <span className="font-bold">
                  {state.winningTeam === 0 ? "我方（玩家+对家）" : "对方（左方+右方）"}
                </span>
              </div>
              <div className="flex justify-between text-base elderly-mode:text-lg pt-2 border-t border-border">
                <span>当前级牌:</span>
                <span className="font-bold">{state.currentLevel}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRestart}
                className="flex-1 h-14 text-lg font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                再来一局
              </Button>
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-1 h-14 text-lg font-bold elderly-mode:h-16 elderly-mode:text-2xl"
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
