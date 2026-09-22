import React, { createContext, useCallback, useContext, useState } from 'react';

export type TabName = 'dashboard' | 'rooms' | 'sensors' | 'events' | 'settings';
export type ScreenName = TabName | 'live' | 'calibration';

export interface NavState {
  screen: ScreenName;
  params: Record<string, unknown>;
}

interface NavContextValue extends NavState {
  navigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
  goBack: () => void;
  activeTab: TabName;
}

const NavContext = createContext<NavContextValue | null>(null);

const TABS: TabName[] = ['dashboard', 'rooms', 'sensors', 'events', 'settings'];

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<NavState[]>([{ screen: 'dashboard', params: {} }]);
  const current = stack[stack.length - 1];

  const navigate = useCallback((screen: ScreenName, params: Record<string, unknown> = {}) => {
    setStack((prev) => {
      // tabs replace the base; sub-screens push
      if ((TABS as string[]).includes(screen)) return [{ screen, params }];
      return [...prev, { screen, params }];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const activeTab: TabName = (TABS as string[]).includes(current.screen)
    ? (current.screen as TabName)
    : (stack.find((s) => (TABS as string[]).includes(s.screen))?.screen as TabName) ?? 'dashboard';

  return (
    <NavContext.Provider value={{ ...current, navigate, goBack, activeTab }}>
      {children}
    </NavContext.Provider>
  );
};

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}

export const TAB_LIST = TABS;
