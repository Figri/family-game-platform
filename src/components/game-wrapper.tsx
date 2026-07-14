"use client";
import { useEffect, useState, type ReactNode } from "react";

interface GameWrapperProps {
  children: ReactNode;
  /** 是否强制横屏显示（用 CSS transform 实现，不调用 orientation API） */
  landscape?: boolean;
}

export function GameWrapper({ children, landscape = false }: GameWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll - prevent all scrolling
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    html.style.touchAction = "manipulation";
    html.style.width = "100%";
    html.style.height = "100%";
    html.style.margin = "0";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "manipulation";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.margin = "0";
    return () => {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      html.style.touchAction = "";
      html.style.width = "";
      html.style.height = "";
      html.style.margin = "";
      body.style.overflow = "";
      body.style.overscrollBehavior = "";
      body.style.touchAction = "";
      body.style.width = "";
      body.style.height = "";
      body.style.margin = "";
    };
  }, []);

  if (!mounted) return null;

  // 普通模式（竖屏游戏如五子棋、俄罗斯方块等）
  if (!landscape) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100dvh",
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
          background: "#FFF9F0",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
      </div>
    );
  }

  // 强制横屏模式（牌类游戏用 CSS transform 实现，不调用 orientation API）
  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        background: "#000",
      }}
    >
      {/* 横屏内容容器：竖屏时旋转90度，横屏时正常显示 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100dvh",
          height: "100vw",
          transform: "translate(-50%, -50%) rotate(90deg)",
          transformOrigin: "center center",
          background: "#FFF9F0",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      {/* 纯 CSS 检测：当屏幕本身是横屏时，取消旋转 */}
      <style>{`
        @media (orientation: landscape) {
          /* 横屏时内容不旋转，直接填满 */
          div[style*="100dvh"][style*="rotate(90deg)"] {
            width: 100vw !important;
            height: 100dvh !important;
            transform: translate(-50%, -50%) rotate(0deg) !important;
          }
        }
      `}</style>
    </div>
  );
}
