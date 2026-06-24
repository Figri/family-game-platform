"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SnakeLeaderboard } from "@/components/games/snake-leaderboard";
import { getHighScore } from "@/lib/games/snake";
import { useEffect, useState } from "react";

export default function SnakeMenuPage() {
  const router = useRouter();
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    setHighScore(getHighScore());
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-2xl hover:scale-110 transition-transform"
            aria-label="返回首页"
          >
            🏠
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight elderly-mode:text-2xl">
              贪吃蛇
            </h1>
            <span className="text-xs text-muted-foreground elderly-mode:text-base">
              经典贪吃蛇游戏
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🐍</div>
            <CardTitle className="text-2xl elderly-mode:text-3xl">
              选择游戏模式
            </CardTitle>
            {highScore > 0 && (
              <p className="text-sm text-muted-foreground elderly-mode:text-base mt-1">
                最高分: {highScore}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => router.push("/game/snake?mode=single")}
              className={cn(
                "w-full h-16 text-xl font-semibold gap-3",
                "elderly-mode:h-20 elderly-mode:text-2xl"
              )}
            >
              <span className="text-2xl">🐍</span>
              单机模式
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/game/snake?mode=duo")}
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
              onClick={() => router.push("/")}
              className={cn(
                "w-full h-14 text-lg gap-2",
                "elderly-mode:h-16 elderly-mode:text-xl"
              )}
            >
              ← 返回首页
            </Button>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl elderly-mode:text-2xl text-center">
              🏆 排行榜
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SnakeLeaderboard />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border elderly-mode:text-base">
        家庭游戏平台 · 贪吃蛇
      </footer>
    </div>
  );
}
