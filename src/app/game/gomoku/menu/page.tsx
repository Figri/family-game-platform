"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GomokuMenuPage() {

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
              五子棋
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              五子连珠，智取对手
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">⚫⚪</div>
            <CardTitle className="text-2xl elderly-mode:text-3xl">
              选择游戏模式
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => { window.location.href = "/family-game-platform/game/gomoku?mode=pve"; }}
              className={cn(
                "w-full h-16 text-xl font-semibold gap-3",
                "elderly-mode:h-20 elderly-mode:text-2xl"
              )}
            >
              <span className="text-2xl">🤖</span>
              人机对战
            </Button>
            <Button
              variant="outline"
              onClick={() => { window.location.href = "/family-game-platform/game/gomoku?mode=pvp"; }}
              className={cn(
                "w-full h-16 text-xl font-semibold gap-3",
                "elderly-mode:h-20 elderly-mode:text-2xl"
              )}
            >
              <span className="text-2xl">👥</span>
              双人对战
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
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 五子棋
      </footer>
    </div>
  );
}
