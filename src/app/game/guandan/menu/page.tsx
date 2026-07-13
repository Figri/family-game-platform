"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GuandanMenuPage() {

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
            <h1 className="text-lg font-bold leading-tight elderly-mode:text-2xl">
              掼蛋
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              四人两副牌竞技
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🂡</div>
            <CardTitle className="text-2xl elderly-mode:text-3xl">
              选择游戏模式
            </CardTitle>
            <p className="text-sm text-muted-foreground elderly-mode:text-base mt-1">
              四人掼蛋，2v2对家配合
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => { window.location.href = "/family-game-platform/game/guandan"; }}
              className={cn(
                "w-full h-16 text-xl font-semibold gap-3",
                "elderly-mode:h-20 elderly-mode:text-2xl"
              )}
            >
              <span className="text-2xl">🤖</span>
              单机模式（vs 3个AI）
            </Button>
            <Button
              variant="ghost"
              onClick={() => { window.location.href = "/family-game-platform/"; }}
              className={cn(
                "w-full h-14 text-lg gap-2",
                "elderly-mode:h-16 elderly-mode:text-xl"
              )}
            >
              ← 返回首页
            </Button>
          </CardContent>
        </Card>

        {/* 游戏规则 */}
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl elderly-mode:text-2xl text-center">
              📖 游戏规则
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground elderly-mode:text-base">
            <p>1. 四人游戏，2v2对家配合</p>
            <p>2. 使用两副牌共108张，每人27张</p>
            <p>3. 基本牌型：单张、对子、三张、三带二、顺子、同花顺</p>
            <p>4. 炸弹：4-10张同点数，可管任何非炸弹牌型</p>
            <p>5. 火箭：四张王，最大牌型</p>
            <p>6. 级牌：当前等级的牌比大王还大</p>
            <p>7. 哪方先出完牌，哪方获胜</p>
            <p>8. 从2开始升级，先打到A的一方赢</p>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 掼蛋
      </footer>
    </div>
  );
}
