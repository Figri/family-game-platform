"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ElderlyModeContextType {
  /** 是否开启老人模式 */
  enabled: boolean;
  /** 切换老人模式 */
  toggle: () => void;
  /** 是否简化动画 */
  reduceMotion: boolean;
  /** 是否减少弹窗 */
  reducePopup: boolean;
  /** 是否自动提示 */
  autoHint: boolean;
}

const ElderlyModeContext = createContext<ElderlyModeContextType>({
  enabled: false,
  toggle: () => {},
  reduceMotion: false,
  reducePopup: false,
  autoHint: false,
});

export function useElderlyMode() {
  return useContext(ElderlyModeContext);
}

export function ElderlyModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const value: ElderlyModeContextType = {
    enabled,
    toggle,
    reduceMotion: enabled,
    reducePopup: enabled,
    autoHint: enabled,
  };

  return (
    <ElderlyModeContext.Provider value={value}>
      <div className={enabled ? "elderly-mode text-2xl" : ""}>
        {children}
      </div>
    </ElderlyModeContext.Provider>
  );
}
