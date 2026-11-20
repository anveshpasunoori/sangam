import type { OmbCase, OmbState } from "@/lib/types";

export const OMB_FLOW: OmbState[] = [
  "RECEIVED",
  "CONFLICT_CHECK",
  "ASSIGNED",
  "UNDER_REVIEW",
  "FINDINGS_ISSUED",
  "CORRECTIVE_ACTION",
  "CLOSED",
];

export const OMB_TYPES = [
  "Wrongful suspension",
  "Moderation decision",
  "Privacy",
  "Accessibility",
  "Impersonation",
  "Unresolved support complaint",
];

const SIMULATED: Record<Exclude<OmbState, "RECEIVED">, string> = {
  CONFLICT_CHECK: "Checked that the reviewer had no part in the original decision (simulated).",
  ASSIGNED: "Assigned to an independent reviewer (simulated).",
  UNDER_REVIEW: "Reviewer is examining records from both sides (simulated).",
  FINDINGS_ISSUED: "Simulated finding: the complaint is upheld in part. Recommendation issued to the platform team.",
  CORRECTIVE_ACTION: "Simulated corrective action: the team must respond within 14 days and the action is tracked here.",
  CLOSED: "Case closed. It is counted in the aggregate transparency report.",
};

export function advanceOmb(prev: OmbCase, date = "Today"): OmbCase {
  const i = OMB_FLOW.indexOf(prev.state);
  if (i < 0 || i === OMB_FLOW.length - 1) throw new Error(`Cannot advance from ${prev.state}`);
  const next = OMB_FLOW[i + 1] as Exclude<OmbState, "RECEIVED">;
  return { ...prev, state: next, log: [...prev.log, { date, state: next, text: SIMULATED[next] }] };
}
