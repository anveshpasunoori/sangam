// Drift check: every state change the web app can make must be allowed by the shared
// contract in contracts/state-machines. If this fails, either the UI logic or the
// contract changed without the other.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { seed } from "@/lib/seed";
import type { CivicCase, CivicState } from "@/lib/types";
import { allowedActions, transition, type CivicAction } from "./civic";
import { OMB_FLOW } from "./ombudsman";

const load = (name: string) => JSON.parse(readFileSync(new URL(`../../../../contracts/state-machines/${name}.json`, import.meta.url), "utf8"));
const civic = load("civic");
const omb = load("ombudsman");

const allowedPairs = new Set<string>(civic.transitions.map((t: { from: string; to: string }) => `${t.from}>${t.to}`));
const sideEvents = new Map<string, string[]>(civic.events_without_state_change.map((e: { action: string; allowed_in: string[] }) => [e.action, e.allowed_in]));

const ACTIONS: CivicAction[] = [
  { type: "advance" },
  { type: "confirm", fixed: true },
  { type: "confirm", fixed: false },
  { type: "escalate" },
  { type: "reopen" },
  { type: "withdraw" },
];

describe("web civic logic stays inside the contract state machine", () => {
  it("uses only states the contract defines", () => {
    for (const c of seed().cases) expect(civic.states).toContain(c.state);
  });

  it("every reachable state change is a contract transition", () => {
    const start: CivicCase = { ...seed().cases[0], state: "SUBMITTED", escalated: false, log: [] };
    const seen = new Set<string>();
    const queue: CivicCase[] = [start];
    while (queue.length) {
      const c = queue.shift()!;
      const key = `${c.state}|${c.escalated}`;
      if (seen.has(key)) continue;
      seen.add(key);
      for (const a of ACTIONS) {
        if (!allowedActions(c).includes(a.type)) continue;
        const next = transition(c, a);
        let prev: CivicState = c.state;
        for (const entry of next.log.slice(c.log.length)) {
          if (entry.state === "ESCALATED") {
            // Escalation is a side event in the contract, or UNRESOLVED -> IN_PROGRESS.
            if (prev === "UNRESOLVED") continue;
            expect(sideEvents.get("escalate"), `escalate from ${prev}`).toContain(prev);
            continue;
          }
          expect(allowedPairs.has(`${prev}>${entry.state}`), `${prev} -> ${entry.state} via ${a.type}`).toBe(true);
          prev = entry.state;
        }
        if (a.type === "escalate" && c.state === "UNRESOLVED") {
          expect(allowedPairs.has("UNRESOLVED>IN_PROGRESS")).toBe(true);
        }
        queue.push(next);
      }
    }
    expect(seen.size).toBeGreaterThan(8);
  });

  it("ombudsman main line matches the contract", () => {
    expect(OMB_FLOW).toEqual(omb.states);
    for (let i = 0; i < OMB_FLOW.length - 1; i++) {
      expect(omb.transitions.some((t: { from: string; to: string }) => t.from === OMB_FLOW[i] && t.to === OMB_FLOW[i + 1])).toBe(true);
    }
  });
});
