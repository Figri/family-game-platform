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
  type DoudizhuState,
  type PlayerIndex,
  type BidAction,
  type PlayAction,
  createInitialState,
  doBid,
  doPlay,
  aiBidDecision,
  aiPlayDecision,
  getRoleName,
  getPlayerName,
} from "@/lib/games/doudizhu";
import { PokerCard as PokerCardComponent, PokerCardBack } from "./poker-card";


interface DoudizhuGameProps {
  onBack?: () => void;
}

export function DoudizhuGame({ onBack }: DoudizhuGameProps) {
  const [state, setState] = useState<DoudizhuState>(createInitialState);
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

  // 渲染玩家头像区域
  const renderPlayerInfo = (index: PlayerIndex) => {
    const player = state.players[index];
    const isCurrent = state.currentPlayer === index && state.phase === "playing";
    const isLandlord = state.landlord === index;
    const positionClass =
      index === 0
        ? "flex-col"
        : index === 1
          ? "flex-col items-end"
          : "flex-col items-start";

    return (
      <div className={cn("flex gap-2", positionClass)}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 border-2",
            isCurrent
              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30"
              : "border-border bg-card",
            index === 0 && "flex-row",
            index === 1 && "flex-row-reverse",
            index === 2 && "flex-row"
          )}
        >
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold elderly-mode:w-16 elderly-mode:h-16 elderly-mode:text-2xl",
              isLandlord
                ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLandlord ? "地" : "农"}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base elderly-mode:text-xl">
              {getPlayerName(index, player.isAI)}
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
            <h1 className="text-lg font-bold elderly-mode:text-2xl">斗地主</h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
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
        <div className="flex items-center gap-2">
          {state.bombCount > 0 && (
            <span className="text-sm px-2 py-1 rounded bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 elderly-mode:text-base">
              💣x{state.bombCount}
            </span>
          )}
          {state.rocketCount > 0 && (
            <span className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 elderly-mode:text-base">
              🚀x{state.rocketCount}
            </span>
          )}
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
        {/* 上方：其他玩家（左侧AI + 右侧AI） */}
        <div className="shrink-0 flex justify-between items-start">
          {/* 左侧玩家 */}
          <div className="flex flex-col items-center gap-2">
            {renderPlayerInfo(2)}
            <div className="flex flex-wrap gap-1 max-w-[120px] justify-center">
              {Array.from({ length: Math.min(state.players[2].hand.length, 8) }).map(
                (_, i) => (
                  <PokerCardBack key={i} size="sm" />
                )
              )}
              {state.players[2].hand.length > 8 && (
                <span className="text-sm text-muted-foreground">+{state.players[2].hand.length - 8}</span>
              )}
            </div>
          </div>

          {/* 中间：出牌区 */}
          <div className="flex-1 flex flex-col items-center justify-start min-h-[120px] px-2">
            {state.currentPlay && state.currentPlayPlayer !== null && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground elderly-mode:text-base">
                  {getPlayerName(state.currentPlayPlayer, state.players[state.currentPlayPlayer].isAI)} 出牌
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
                  {handTypeName(state.currentPlay.type)}
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
            <div className="flex flex-wrap gap-1 max-w-[120px] justify-center">
              {Array.from({ length: Math.min(state.players[1].hand.length, 8) }).map(
                (_, i) => (
                  <PokerCardBack key={i} size="sm" />
                )
              )}
              {state.players[1].hand.length > 8 && (
                <span className="text-sm text-muted-foreground">+{state.players[1].hand.length - 8}</span>
              )}
            </div>
          </div>
        </div>

        {/* 叫地主界面 */}
        {state.phase === "bidding" && state.currentPlayer === 0 && (
          <div className="shrink-0 flex flex-col items-center gap-4 py-4">
            <p className="text-lg font-bold elderly-mode:text-2xl">轮到您叫地主</p>
            <div className="flex gap-4">
              <Button
                onClick={() => handleBid("call")}
                className="h-14 px-8 text-xl font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                叫地主
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBid("pass")}
                className="h-14 px-8 text-xl font-bold elderly-mode:h-16 elderly-mode:text-2xl"
              >
                不叫
              </Button>
            </div>
          </div>
        )}

        {/* 底牌显示（叫地主结束后短暂显示） */}
        {state.phase === "playing" && state.landlord !== null && state.bottomCards.length > 0 && (
          <div className="shrink-0 flex justify-center gap-2 py-1">
            <span className="text-sm text-muted-foreground elderly-mode:text-base">底牌:</span>
            {state.bottomCards.map((card) => (
              <PokerCardComponent key={card.id} card={card} size="sm" disabled />
            ))}
          </div>
        )}

        {/* 玩家手牌区 */}
        <div className="flex-1 flex flex-col justify-end min-h-0">
          {renderPlayerInfo(0)}

          {/* 手牌 */}
          <div className="flex flex-wrap justify-center gap-1 py-2 px-1 overflow-y-auto">
            {state.players[0].hand.map((card, idx) => {
              const isSelected = selectedCards.has(card.id);
              return (
                <div
                  key={card.id}
                  className={cn(
                    "transition-transform",
                    idx > 0 && "-ml-4 elderly-mode:-ml-2"
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
              {state.winner === 0 ? "🎉 您赢了！" : "😢 您输了"}
            </h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-lg elderly-mode:text-xl">
                <span>赢家:</span>
                <span className="font-bold">
                  {state.winner !== null
                    ? getPlayerName(state.winner, state.players[state.winner].isAI)
                    : ""}
                </span>
              </div>
              {state.spring && (
                <div className="text-center text-red-500 font-bold elderly-mode:text-xl">
                  🌸 春天！
                </div>
              )}
              {state.antiSpring && (
                <div className="text-center text-red-500 font-bold elderly-mode:text-xl">
                  🌸 反春！
                </div>
              )}
              {state.scores && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="flex justify-between text-base elderly-mode:text-lg">
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
                  <div className="flex justify-between text-base elderly-mode:text-lg">
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
                  <div className="flex justify-between text-base elderly-mode:text-lg">
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
