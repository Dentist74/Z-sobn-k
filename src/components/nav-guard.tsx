"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

type NavGuard = {
  setDirty: (b: boolean) => void;
  confirmLeave: () => boolean;
};

const Ctx = createContext<NavGuard>({
  setDirty: () => {},
  confirmLeave: () => true,
});

const MESSAGE =
  "Máš rozdělanou akci, která se ještě neuložila. Opravdu chceš odejít? Rozpracované údaje se ztratí.";

export function NavGuardProvider({ children }: { children: React.ReactNode }) {
  const dirty = useRef(false);

  const setDirty = useCallback((b: boolean) => {
    dirty.current = b;
  }, []);

  const confirmLeave = useCallback(() => {
    if (!dirty.current) return true;
    const ok = window.confirm(MESSAGE);
    if (ok) dirty.current = false;
    return ok;
  }, []);

  // Zavření/obnovení karty prohlížeče (mimo SPA navigaci).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return <Ctx.Provider value={{ setDirty, confirmLeave }}>{children}</Ctx.Provider>;
}

export function useNavGuard() {
  return useContext(Ctx);
}

// Pomocný hook pro formuláře: nastaví/zruší „rozdělanost" podle podmínky.
export function useDirty(active: boolean) {
  const { setDirty } = useNavGuard();
  useEffect(() => {
    setDirty(active);
    return () => setDirty(false);
  }, [active, setDirty]);
}
