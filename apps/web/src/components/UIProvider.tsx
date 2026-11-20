"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./ui";

interface SheetSpec {
  title: string;
  render: (close: () => void) => ReactNode;
}

interface UIValue {
  openSheet: (title: string, render: (close: () => void) => ReactNode) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
  story: number | null;
  setStory: (i: number | null) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetSpec | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [story, setStory] = useState<number | null>(null);
  const returnFocus = useRef<Element | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const closeSheet = useCallback(() => {
    setSheet(null);
    const el = returnFocus.current as HTMLElement | null;
    if (el && document.contains(el)) el.focus();
  }, []);

  const openSheet = useCallback((title: string, render: SheetSpec["render"]) => {
    returnFocus.current = document.activeElement;
    setSheet({ title, render });
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(null), 3200);
  }, []);

  // Focus the first field in a newly opened sheet, and trap Tab inside it.
  useEffect(() => {
    if (!sheet || !sheetRef.current) return;
    const root = sheetRef.current;
    const first = root.querySelector<HTMLElement>(".stack input, .stack textarea, .stack select, .stack button") ?? root.querySelector<HTMLElement>("button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
      if (e.key !== "Tab") return;
      const f = [...root.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href]")].filter((x) => !x.hasAttribute("disabled"));
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  return (
    <UIContext.Provider value={{ openSheet, closeSheet, toast, story, setStory }}>
      {children}
      {sheet && (
        <div id="sheet-root">
          <button className="scrim" aria-label="Close" onClick={closeSheet} tabIndex={-1} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet.title} ref={sheetRef}>
            <div className="sh">
              <h2>{sheet.title}</h2>
              <button className="icon" aria-label="Close" onClick={closeSheet}>
                <Icon name="close" />
              </button>
            </div>
            <div className="stack">{sheet.render(closeSheet)}</div>
          </div>
        </div>
      )}
      <div id="toast" aria-live="polite">
        {toastMsg && <div>{toastMsg}</div>}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const v = useContext(UIContext);
  if (!v) throw new Error("useUI must be used inside UIProvider");
  return v;
}
