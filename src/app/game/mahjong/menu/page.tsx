"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { type GameRules, DEFAULT_RULES } from "@/lib/games/sichuan-mahjong";

export default function MahjongMenuPage() {
  const elderlyMode = false;
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);
  const [showRules, setShowRules] = useState(false);

  const toggleRule = (key: keyof GameRules) => {
    setRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startGame = () => {
    const params = new URLSearchParams();
    (Object.keys(rules) as Array<keyof GameRules>).forEach((key) => {
      params.set(key, String(rules[key]));
    });
    window.location.href = `/family-game-platform/game/mahjong?${params.toString()}`;
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { window.location.href = "/family-game-platform/"; }}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label="返回首页"
          >
            🏠
          </button>
          <div className="flex flex-col">
            <h1 className={cn("text-lg font-bold leading-tight", elderlyMode && "text-2xl")}>
              麻将
            </h1>
            <span className={cn("text-xs text-muted-foreground", elderlyMode && "text-base")}>
              经典四人麻将
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🀄</div>
            <CardTitle className={cn("text-2xl", elderlyMode && "text-3xl")}>
              选择游戏模式
            </CardTitle>
            <p className={cn("text-sm text-muted-foreground mt-1", elderlyMode && "text-base")}>
              经典四人麻将，横屏体验
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={startGame}
              className={cn(
                "w-full h-16 text-xl font-semibold gap-3",
                elderlyMode && "h-20 text-2xl"
              )}
            >
              <span className="text-2xl">🤖</span>
              单机模式（vs 3个AI）
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowRules((v) => !v)}
              className={cn(
                "w-full h-14 text-lg gap-2",
                elderlyMode && "h-16 text-xl"
              )}
            >
              {showRules ? "收起规则配置" : "⚙️ 规则配置"}
            </Button>

            {showRules && (
              <div className="space-y-4 pt-2 border-t">
                <h3 className={cn("font-semibold text-center", elderlyMode && "text-xl")}>
                  规则配置
                </h3>

                <div className="space-y-3">
                  <RuleSwitch
                    label="可碰"
                    checked={rules.enablePong}
                    onChange={() => toggleRule("enablePong")}
                    elderlyMode={elderlyMode}
                  />
                  <RuleSwitch
                    label="可明杠"
                    checked={rules.enableMingKong}
                    onChange={() => toggleRule("enableMingKong")}
                    elderlyMode={elderlyMode}
                  />
                  <RuleSwitch
                    label="可暗杠"
                    checked={rules.enableAnKong}
                    onChange={() => toggleRule("enableAnKong")}
                    elderlyMode={elderlyMode}
                  />
                  <RuleSwitch
                    label="可补杠"
                    checked={rules.enableBuKong}
                    onChange={() => toggleRule("enableBuKong")}
                    elderlyMode={elderlyMode}
                  />
                  <RuleSwitch
                    label="点炮胡"
                    checked={rules.enableDianPao}
                    onChange={() => toggleRule("enableDianPao")}
                    elderlyMode={elderlyMode}
                  />
                  <RuleSwitch
                    label="自摸"
                    checked={rules.enableZiMo}
                    onChange={() => toggleRule("enableZiMo")}
                    elderlyMode={elderlyMode}
                  />
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setRules(DEFAULT_RULES)}
                  className={cn("w-full h-12 text-base", elderlyMode && "h-14 text-lg")}
                >
                  恢复默认规则
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => { window.location.href = "/family-game-platform/"; }}
              className={cn(
                "w-full h-14 text-lg gap-2",
                elderlyMode && "h-16 text-xl"
              )}
            >
              ← 返回首页
            </Button>
          </CardContent>
        </Card>

        {/* 游戏规则 */}
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className={cn("text-xl text-center", elderlyMode && "text-2xl")}>
              📖 游戏规则
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("space-y-2 text-sm text-muted-foreground", elderlyMode && "text-base")}>
            <p>1. 四人游戏，使用136张牌（含风牌、箭牌）</p>
            <p>2. 每人发13张牌，轮流摸牌出牌</p>
            <p>3. 不能吃，可以碰、杠（明杠/暗杠/补杠）</p>
            <p>4. 可以自摸胡牌，也可以点炮胡牌</p>
            <p>5. 一家胡牌后本局结束</p>
            <p>6. 胡牌公式：4副（顺子/刻子）+ 1对将</p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className={cn("text-center py-4 text-xs text-muted-foreground border-t border-border", elderlyMode && "text-base")}>
        家庭游戏平台 · 麻将
      </footer>
    </div>
  );
}

function RuleSwitch({
  label,
  checked,
  onChange,
  elderlyMode,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  elderlyMode: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label
        htmlFor={`rule-${label}`}
        className={cn("text-base cursor-pointer", elderlyMode && "text-lg")}
      >
        {label}
      </Label>
      <Switch
        id={`rule-${label}`}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
