import type { ActorKind, CivicCase, CivicState } from "@/lib/types";

/**
 * Sangam Civic case state machine.
 *
 * Blueprint requirement: no transition outside the defined state machine, and
 * every transition is logged with its actor. Only the complainant can confirm
 * a resolution.
 */
export const FLOW: CivicState[] = [
  "SUBMITTED",
  "TRIAGED",
  "ROUTING_PENDING",
  "ROUTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESPONSE_RECEIVED",
  "RESOLUTION_REVIEW",
];

export const TERMINAL: CivicState[] = [
  "RESOLVED",
  "UNRESOLVED",
  "CLOSED",
  "WITHDRAWN",
  "REJECTED",
  "DUPLICATE",
];

export const CATEGORIES = [
  "Roads",
  "Transport",
  "Water",
  "Sanitation",
  "Electricity",
  "Waste",
  "Healthcare",
  "Education",
  "Consumer services",
  "Public services",
  "Environment",
  "Public safety",
];

export const REPORT_STEPS = ["Category", "Details", "Evidence", "Location", "Privacy", "Review"];

/** Simulated actors for steps that a real product would get from staff or offices. */
export const SIMULATED: Partial<Record<CivicState, [string, ActorKind, string]>> = {
  TRIAGED: ["Sangam Civic triage (simulated)", "s", "Checked for duplicates and missing details. Category confirmed."],
  ROUTING_PENDING: [
    "Sangam Civic (simulated)",
    "s",
    "Finding the responsible office. No official integration is connected yet.",
  ],
  ROUTED: [
    "Sangam Civic (simulated)",
    "s",
    "Guided hand-off: the real product would show the verified official channel here. Nobody has been contacted.",
  ],
  ACKNOWLEDGED: [
    "Authority (simulated)",
    "o",
    "Simulated acknowledgement for demonstration. The real product shows this only after an official acknowledgement is verified.",
  ],
  IN_PROGRESS: ["Authority (simulated)", "o", "Simulated update: work scheduled."],
  RESPONSE_RECEIVED: ["Authority (simulated)", "o", "Simulated response: the office reports the work as complete."],
  RESOLUTION_REVIEW: ["Sangam Civic (simulated)", "s", "Waiting for you to confirm whether the issue is fixed."],
  CLOSED: ["Sangam Civic (simulated)", "s", "Case closed and kept in your history."],
};

export type CivicAction =
  | { type: "advance" }
  | { type: "confirm"; fixed: boolean }
  | { type: "escalate" }
  | { type: "reopen" }
  | { type: "withdraw" };

export const isTerminal = (s: CivicState) => TERMINAL.includes(s);

export function allowedActions(c: CivicCase): CivicAction["type"][] {
  const out: CivicAction["type"][] = [];
  const done = isTerminal(c.state);
  if ((!done && c.state !== "RESOLUTION_REVIEW") || c.state === "RESOLVED") out.push("advance");
  if (c.state === "RESOLUTION_REVIEW") out.push("confirm");
  if (["ROUTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESPONSE_RECEIVED", "UNRESOLVED"].includes(c.state) && !c.escalated)
    out.push("escalate");
  if (["RESOLVED", "UNRESOLVED", "CLOSED"].includes(c.state)) out.push("reopen");
  if (!done) out.push("withdraw");
  return out;
}

export class TransitionError extends Error {}

function log(c: CivicCase, state: CivicState, actor: string, kind: ActorKind, text: string, date: string) {
  c.state = state;
  c.log.push({ date, state, actor, kind, text });
}

/**
 * Applies an action to a case and returns a new case. Throws TransitionError
 * if the action is not allowed from the current state.
 */
export function transition(prev: CivicCase, action: CivicAction, date = "Today"): CivicCase {
  if (!allowedActions(prev).includes(action.type)) {
    throw new TransitionError(`${action.type} is not allowed from ${prev.state}`);
  }
  const c: CivicCase = structuredClone(prev);
  switch (action.type) {
    case "advance": {
      if (c.state === "RESOLVED") {
        log(c, "CLOSED", ...SIMULATED.CLOSED!, date);
        break;
      }
      let i = FLOW.indexOf(c.state);
      // REOPENED or ESCALATED sit outside the main line; resume from triage.
      if (i < 0) i = FLOW.indexOf("TRIAGED") - 1;
      const next = FLOW[i + 1];
      if (next === "ROUTED") c.authority = "Navapur Municipal Corporation (fictional)";
      log(c, next, ...SIMULATED[next]!, date);
      break;
    }
    case "confirm":
      if (action.fixed) {
        log(c, "RESOLVED", "You", "u", "You confirmed the issue is fixed. Marked as a verified resolution.", date);
      } else {
        log(c, "UNRESOLVED", "You", "u", "You reported the issue is not fixed. The office’s response is recorded as disputed.", date);
      }
      break;
    case "escalate":
      c.escalated = true;
      c.log.push({
        date,
        state: "ESCALATED",
        actor: "You",
        kind: "u",
        text: "You escalated this case. The real product would guide you to the next verified official level.",
      });
      if (c.state === "UNRESOLVED") c.state = "IN_PROGRESS";
      break;
    case "reopen":
      c.escalated = false;
      log(c, "REOPENED", "You", "u", "You reopened this case.", date);
      log(c, "TRIAGED", ...SIMULATED.TRIAGED!, date);
      break;
    case "withdraw":
      log(c, "WITHDRAWN", "You", "u", "You withdrew this complaint.", date);
      break;
  }
  return c;
}

/** Progress index along FLOW for the progress track; -1 when outside the main line. */
export function progressIndex(c: CivicCase) {
  return FLOW.indexOf(c.state);
}

export function stateTone(s: CivicState): "ok" | "e" | "s" | "" | "t" {
  if (s === "RESOLVED") return "ok";
  if (s === "UNRESOLVED" || s === "REJECTED") return "e";
  if (s === "ESCALATED" || s === "RESOLUTION_REVIEW" || s === "REOPENED") return "s";
  if (s === "WITHDRAWN" || s === "CLOSED" || s === "DUPLICATE") return "";
  return "t";
}

export interface DraftCheck {
  ok: boolean;
  error?: string;
}

export function validateStep(
  step: number,
  d: { category: string; title: string; description: string; location: string; confirmed: boolean },
  screenText: (t: string) => { verdict: string; reason?: string },
): DraftCheck {
  if (step === 0 && !d.category) return { ok: false, error: "Choose a category to continue." };
  if (step === 1) {
    if (d.title.trim().length < 8) return { ok: false, error: "Give the issue a title of at least 8 characters." };
    if (d.description.trim().length < 20) return { ok: false, error: "Describe the issue in at least 20 characters." };
    const r = screenText(`${d.title} ${d.description}`);
    if (r.verdict !== "allow") return { ok: false, error: `${r.reason} Please revise before continuing.` };
  }
  if (step === 3 && d.location.trim().length < 4) return { ok: false, error: "Enter a street, landmark or ward." };
  if (step === 5 && !d.confirmed) return { ok: false, error: "Confirm the accuracy statement to submit." };
  return { ok: true };
}

/** SHA-256 of a file, shortened for display as "abcd…wxyz". */
export async function fingerprint(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 4)}…${hex.slice(-4)}`;
}

export function formatSize(bytes: number) {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
