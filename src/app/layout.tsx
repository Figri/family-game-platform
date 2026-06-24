import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/lib/theme";
import { ElderlyModeProvider } from "@/lib/elderly-mode";
import { Toaster } from "@/components/ui/sonner";

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "家庭游戏平台",
  description: "一个适合全家人的在线游戏平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${notoSansSC.variable} min-h-full flex flex-col antialiased`}
        style={{ fontFamily: "var(--font-noto-sans-sc), sans-serif", fontSize: "18px" }}
      >
        <ThemeProvider>
          <ElderlyModeProvider>
            {children}
            <Toaster />
          </ElderlyModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
