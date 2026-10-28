"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "g9-film-lab:theme:v1";
const CHANGE_EVENT = "g9-film-lab:theme-change";

function readTheme() {
  try { return localStorage.getItem(KEY) === "dark"; } catch { return false; }
}

export function ThemeToggle() {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, []);
  const dark = useSyncExternalStore(subscribe, readTheme, () => false);

  useEffect(() => {
    document.documentElement.dataset.theme = readTheme() ? "dark" : "light";
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* Theme still applies for this visit. */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} theme`} title={`Switch to ${dark ? "light" : "dark"} theme`}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
