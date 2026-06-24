"use client";

import { useState, useEffect } from "react";
import {
  getTodayLeaderboard,
  getWeekLeaderboard,
  getAllTimeLeaderboard,
  type LeaderboardEntry,
} from "@/lib/games/snake";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = "today" | "week" | "all";

interface SnakeLeaderboardProps {
  className?: string;
}

export function SnakeLeaderboard({ className }: SnakeLeaderboardProps) {
  const [period, setPeriod] = useState<Period>("today");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    let data: LeaderboardEntry[];
    switch (period) {
      case "today":
        data = getTodayLeaderboard();
        break;
      case "week":
        data = getWeekLeaderboard();
        break;
      case "all":
        data = getAllTimeLeaderboard();
        break;
    }
    setEntries(data.slice(0, 10));
  }, [period]);

  return (
    <div className={cn("w-full", className)}>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full grid grid-cols-3 h-12 elderly-mode:h-14">
          <TabsTrigger
            value="today"
            className="text-base elderly-mode:text-lg"
          >
            今日
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="text-base elderly-mode:text-lg"
          >
            本周
          </TabsTrigger>
          <TabsTrigger
            value="all"
            className="text-base elderly-mode:text-lg"
          >
            总榜
          </TabsTrigger>
        </TabsList>
        <TabsContent value={period} className="mt-4">
          <LeaderboardTable entries={entries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-lg elderly-mode:text-xl">
        暂无记录
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold elderly-mode:text-lg">
              排名
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold elderly-mode:text-lg">
              分数
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold elderly-mode:text-lg">
              模式
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold elderly-mode:text-lg hidden sm:table-cell">
              时间
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry, index) => (
            <tr
              key={index}
              className={cn(
                "hover:bg-muted/50",
                index === 0 && "bg-amber-50 dark:bg-amber-950/20",
                index === 1 && "bg-slate-50 dark:bg-slate-950/20",
                index === 2 && "bg-orange-50 dark:bg-orange-950/20"
              )}
            >
              <td className="px-4 py-3 text-sm elderly-mode:text-lg font-medium">
                {index === 0 ? (
                  <span className="text-amber-600">🥇 1</span>
                ) : index === 1 ? (
                  <span className="text-slate-600">🥈 2</span>
                ) : index === 2 ? (
                  <span className="text-orange-600">🥉 3</span>
                ) : (
                  index + 1
                )}
              </td>
              <td className="px-4 py-3 text-sm elderly-mode:text-lg font-bold">
                {entry.score}
              </td>
              <td className="px-4 py-3 text-sm elderly-mode:text-lg">
                {entry.mode === "single" ? "单机" : "双人"}
              </td>
              <td className="px-4 py-3 text-sm elderly-mode:text-lg text-muted-foreground hidden sm:table-cell">
                {new Date(entry.date).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
