import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "乐玩游戏 - 家庭娱乐 · 快乐相聚",
  description: "适合全家人的在线游戏平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${notoSansSC.variable} min-h-full flex flex-col antialiased`}
        style={{
          fontFamily: "var(--font-noto-sans-sc), sans-serif",
          backgroundColor: "#FFF9F0",
        }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}