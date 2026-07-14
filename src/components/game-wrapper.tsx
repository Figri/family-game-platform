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
      <div className="gw-container">
        {children}
        <style>{`
          .gw-container {
            width: 100vw;
            height: 100dvh;
            overflow: hidden;
            position: fixed;
            top: 0;
            left: 0;
            background: #FFF9F0;
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
          }
        `}</style>
      </div>
    );
  }

  // 强制横屏模式：竖屏时内容旋转90度变成横屏
  return (
    <div className="gw-outer">
      <div className="gw-rotated">
        {children}
      </div>
      <style>{`
        .gw-outer {
          width: 100vw;
          height: 100dvh;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
          background: #000;
        }
        .gw-rotated {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100dvh;
          height: 100vw;
          transform: translate(-50%, -50%) rotate(90deg);
          transform-origin: center center;
          background: #FFF9F0;
          overflow: hidden;
        }
        /* 当设备本身横屏时，不旋转，直接填满 */
        @media (orientation: landscape) {
          .gw-rotated {
            width: 100vw !important;
            height: 100dvh !important;
            transform: none !important;
            top: 0 !important;
            left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}