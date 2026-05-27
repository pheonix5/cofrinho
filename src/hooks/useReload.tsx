import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ReloadCtx = {
  token: number;
  bump: () => void;
};

const Ctx = createContext<ReloadCtx | null>(null);

export function ReloadProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0);
  const bump = useCallback(() => setToken((t) => t + 1), []);
  const value = useMemo(() => ({ token, bump }), [token, bump]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReloadToken(): number {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ReloadProvider missing');
  return ctx.token;
}

export function useBumpReload(): () => void {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ReloadProvider missing');
  return ctx.bump;
}
