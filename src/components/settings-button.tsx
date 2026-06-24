"use client";

import { useState } from "react";
import { SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useElderlyMode } from "@/lib/elderly-mode";
import { useUserStore, DEFAULT_AVATARS } from "@/lib/user-store";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const { theme, setTheme } = useTheme();
  const { enabled: elderlyEnabled, toggle: toggleElderly } = useElderlyMode();
  const { nickname, avatarId, setNickname, setAvatar } = useUserStore();

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed.length === 0) {
      toast.error("昵称不能为空");
      return;
    }
    if (trimmed.length > 12) {
      toast.error("昵称最多12个字符");
      return;
    }
    setNickname(trimmed);
    toast.success("昵称修改成功");
  };

  const handleAvatarSelect = (id: string) => {
    setAvatar(id);
    toast.success("头像切换成功");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="elderly-mode:size-12" />
        }
      >
        <SettingsIcon className="size-5 elderly-mode:size-8" />
        <span className="sr-only">设置</span>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="elderly-mode:text-2xl">设置</SheetTitle>
          <SheetDescription className="elderly-mode:text-lg">
            个人偏好与游戏设置
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4 overflow-y-auto flex-1">
          {/* 主题切换 */}
          <div className="flex flex-col gap-3">
            <Label className="elderly-mode:text-xl">主题模式</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className="elderly-mode:h-12 elderly-mode:text-lg flex-1"
              >
                ☀️ 浅色
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className="elderly-mode:h-12 elderly-mode:text-lg flex-1"
              >
                🌙 深色
              </Button>
            </div>
          </div>

          <Separator />

          {/* 老人模式 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Label className="elderly-mode:text-xl">老人模式</Label>
              <span className="text-xs text-muted-foreground elderly-mode:text-base">
                放大字体、简化操作
              </span>
            </div>
            <Switch
              checked={elderlyEnabled}
              onCheckedChange={toggleElderly}
              className="elderly-mode:[&>span]:size-5"
            />
          </div>

          <Separator />

          {/* 昵称修改 */}
          <div className="flex flex-col gap-3">
            <Label className="elderly-mode:text-xl">昵称</Label>
            <div className="flex gap-2">
              <Input
                placeholder={nickname || "输入昵称"}
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                className="elderly-mode:h-12 elderly-mode:text-lg"
              />
              <Button
                onClick={handleSaveNickname}
                className="elderly-mode:h-12 elderly-mode:text-lg"
              >
                保存
              </Button>
            </div>
            {nickname && (
              <p className="text-xs text-muted-foreground elderly-mode:text-base">
                当前昵称：{nickname}
              </p>
            )}
          </div>

          <Separator />

          {/* 头像选择 */}
          <div className="flex flex-col gap-3">
            <Label className="elderly-mode:text-xl">头像</Label>
            <div className="grid grid-cols-6 gap-2">
              {DEFAULT_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleAvatarSelect(avatar.id)}
                  className={cn(
                    "flex items-center justify-center rounded-xl p-2 text-2xl transition-all",
                    "hover:bg-accent",
                    "elderly-mode:text-4xl elderly-mode:p-3",
                    avatar.id === avatarId &&
                      "ring-2 ring-primary bg-primary/10"
                  )}
                  title={avatar.label}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
