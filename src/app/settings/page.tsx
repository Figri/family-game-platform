"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUserStore } from "@/lib/user-store";

export default function SettingsPage() {
  const {
    nickname,
    setNickname,
    soundEnabled,
    setSoundEnabled,
    bgmEnabled,
    setBgmEnabled,
  } = useUserStore();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname || "");

  const handleNicknameSave = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      toast.error("昵称需要1-12个字符");
      return;
    }
    setNickname(trimmed);
    setEditingNickname(false);
    toast.success("昵称修改成功");
  };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: "#FFF9F0" }}>
      {/* 顶部 */}
      <header className="flex items-center gap-3 px-4 sm:px-6 py-4">
        <button
          className="text-2xl hover:scale-110 transition-transform"
          style={{ minHeight: "56px", minWidth: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { window.location.href = "/family-game-platform/"; }}
          aria-label="返回首页"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold" style={{ color: "#3D2C1E" }}>
          设置
        </h1>
      </header>

      {/* 设置内容 */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        <div
          className="max-w-lg mx-auto rounded-2xl shadow-md p-6 flex flex-col gap-6"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          {/* 昵称修改 */}
          <div className="flex flex-col gap-3">
            <label
              className="text-xl font-bold"
              style={{ color: "#3D2C1E" }}
            >
              昵称
            </label>
            {!editingNickname ? (
              <button
                className="flex items-center justify-between px-4 py-3 rounded-xl text-lg transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "#FEF3E2",
                  color: "#3D2C1E",
                  minHeight: "56px",
                }}
                onClick={() => {
                  setNicknameInput(nickname || "");
                  setEditingNickname(true);
                }}
              >
                <span>{nickname || "点击设置昵称"}</span>
                <span>✏️</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-xl text-lg border-2 outline-none"
                  style={{
                    borderColor: "#F3D9C1",
                    backgroundColor: "#FFFFFF",
                    color: "#3D2C1E",
                    minHeight: "56px",
                  }}
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNicknameSave();
                    if (e.key === "Escape") setEditingNickname(false);
                  }}
                  autoFocus
                  maxLength={12}
                  placeholder="输入昵称（1-12字符）"
                />
                <button
                  className="px-6 py-3 rounded-xl text-lg font-medium text-white"
                  style={{ backgroundColor: "#F97316", minHeight: "56px" }}
                  onClick={handleNicknameSave}
                >
                  保存
                </button>
              </div>
            )}
          </div>

          {/* 分割线 */}
          <div style={{ borderTop: "1px solid #F3D9C1" }} />

          {/* 游戏音效 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold" style={{ color: "#3D2C1E" }}>
                游戏音效
              </p>
              <p className="text-base" style={{ color: "#8B7355" }}>
                出牌、消除等操作音效
              </p>
            </div>
            <button
              className="relative w-16 h-10 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: soundEnabled ? "#F97316" : "#D1D5DB",
                minHeight: "40px",
              }}
              onClick={() => setSoundEnabled(!soundEnabled)}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span
                className="absolute top-1 w-8 h-8 bg-white rounded-full shadow transition-transform duration-200"
                style={{
                  left: soundEnabled ? "32px" : "4px",
                }}
              />
            </button>
          </div>

          {/* 分割线 */}
          <div style={{ borderTop: "1px solid #F3D9C1" }} />

          {/* 背景音乐 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold" style={{ color: "#3D2C1E" }}>
                背景音乐
              </p>
              <p className="text-base" style={{ color: "#8B7355" }}>
                游戏中的背景音乐
              </p>
            </div>
            <button
              className="relative w-16 h-10 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: bgmEnabled ? "#F97316" : "#D1D5DB",
                minHeight: "40px",
              }}
              onClick={() => setBgmEnabled(!bgmEnabled)}
              role="switch"
              aria-checked={bgmEnabled}
            >
              <span
                className="absolute top-1 w-8 h-8 bg-white rounded-full shadow transition-transform duration-200"
                style={{
                  left: bgmEnabled ? "32px" : "4px",
                }}
              />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}