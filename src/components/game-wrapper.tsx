"use client";
import { useEffect, useState, type ReactNode } from "react";

interface GameWrapperProps {
  children: ReactNode;
}

export function GameWrapper({ children }: GameWrapperProps) {
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