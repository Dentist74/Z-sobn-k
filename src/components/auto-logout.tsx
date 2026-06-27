"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/app/actions/auth";

// Odhlásí uživatele po zadané době nečinnosti. minutes = 0 → vypnuto.
export function AutoLogout({ minutes }: { minutes: number }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!minutes || minutes <= 0) return;
    const ms = minutes * 60 * 1000;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        logout();
      }, ms);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes]);

  return null;
}
