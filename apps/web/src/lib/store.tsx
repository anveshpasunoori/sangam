"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { seed, STATE_VERSION } from "./seed";
import type { State } from "./types";

const KEY = "sangam:state";

type Updater = (draft: State) => void;

interface StoreValue {
  state: State;
  ready: boolean;
  /** Mutate a copy of the state; the copy replaces the state and is persisted. */
  update: (fn: Updater) => void;
  /** Allocate a new unique number (for ids and references). */
  nextSeq: () => number;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function load(): State | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s.version === STATE_VERSION ? s : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(seed);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const saved = load();
    if (saved) setState(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode); the app keeps working in memory */
    }
  }, [state, ready]);

  const update = useCallback((fn: Updater) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const nextSeq = useCallback(() => {
    const n = ref.current.seq + 1;
    ref.current = { ...ref.current, seq: n };
    setState((prev) => ({ ...prev, seq: Math.max(prev.seq, n) }));
    return n;
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setState({ ...seed(), prefs: { ...seed().prefs, onboarded: true } });
  }, []);

  return <StoreContext.Provider value={{ state, ready, update, nextSeq, reset }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

/** Toggle membership of a value in a string/number array, in place. */
export function toggle<T>(arr: T[], v: T): boolean {
  const i = arr.indexOf(v);
  if (i >= 0) {
    arr.splice(i, 1);
    return false;
  }
  arr.push(v);
  return true;
}

export function remove<T>(arr: T[], v: T) {
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1);
}
