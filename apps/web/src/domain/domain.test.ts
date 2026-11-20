import { describe, expect, it } from "vitest";
import { seed } from "@/lib/seed";
import type { CivicCase, OmbCase, Post } from "@/lib/types";
import { screen } from "./screening";
import { allowedActions, transition, TransitionError, validateStep, FLOW } from "./civic";
import { advanceOmb, OMB_FLOW } from "./ombudsman";
import { buildFeed, canView } from "./feed";

describe("pre-publish screening", () => {
  it("allows criticism of institutions", () => {
    expect(screen("The corporation’s response has been poor and the plan is a mess.").verdict).toBe("allow");
  });
  it("asks for a revision on insults, with a reason", () => {
    const r = screen("You are an idiot");
    expect(r.verdict).toBe("revise");
    expect(r.verdict === "revise" && r.reason.length > 0).toBe(true);
  });
  it("flags phone numbers", () => {
    expect(screen("Call him on 98765 43210").verdict).toBe("revise");
  });
});

describe("civic state machine", () => {
  const base = () => structuredClone(seed().cases[0]);

  it("walks the main line in order and logs every step", () => {
    let c: CivicCase = { ...base(), state: "SUBMITTED", log: [] };
    for (let i = 1; i < FLOW.length; i++) {
      c = transition(c, { type: "advance" });
      expect(c.state).toBe(FLOW[i]);
    }
    expect(c.log).toHaveLength(FLOW.length - 1);
    expect(c.log.every((l) => l.actor.length > 0)).toBe(true);
  });

  it("refuses advance at RESOLUTION_REVIEW: only the complainant can confirm", () => {
    const c = { ...base(), state: "RESOLUTION_REVIEW" as const };
    expect(() => transition(c, { type: "advance" })).toThrow(TransitionError);
    expect(allowedActions(c)).toContain("confirm");
  });

  it("marks not-fixed as UNRESOLVED, then allows escalate and reopen", () => {
    const c = transition({ ...base(), state: "RESOLUTION_REVIEW" }, { type: "confirm", fixed: false });
    expect(c.state).toBe("UNRESOLVED");
    expect(allowedActions(c)).toEqual(expect.arrayContaining(["escalate", "reopen"]));
    expect(c.log.at(-1)?.kind).toBe("u");
  });

  it("closes a resolved case", () => {
    const c = transition({ ...base(), state: "RESOLVED" }, { type: "advance" });
    expect(c.state).toBe("CLOSED");
  });

  it("does not allow withdrawing a terminal case", () => {
    expect(() => transition({ ...base(), state: "CLOSED" }, { type: "withdraw" })).toThrow(TransitionError);
  });

  it("does not mutate the input case", () => {
    const c = base();
    const before = JSON.stringify(c);
    transition(c, { type: "advance" });
    expect(JSON.stringify(c)).toBe(before);
  });

  it("validates report steps", () => {
    const d = { category: "", title: "", description: "", location: "", confirmed: false };
    expect(validateStep(0, d, screen).ok).toBe(false);
    expect(validateStep(1, { ...d, title: "Broken pipe on Main St", description: "short" }, screen).ok).toBe(false);
    expect(
      validateStep(1, { ...d, title: "Broken pipe on Main St", description: "Water has leaked for two days now.", }, screen).ok,
    ).toBe(true);
    expect(validateStep(5, d, screen).ok).toBe(false);
  });
});

describe("ombudsman", () => {
  it("advances through every state and stops at CLOSED", () => {
    let o: OmbCase = { ...seed().ombudsman[0], state: "RECEIVED", log: [] };
    for (let i = 1; i < OMB_FLOW.length; i++) o = advanceOmb(o);
    expect(o.state).toBe("CLOSED");
    expect(() => advanceOmb(o)).toThrow();
  });
});

describe("audience enforcement and feeds", () => {
  it("hides a Friends-only post from a non-friend", () => {
    const s = seed();
    const p3 = s.posts.find((p) => p.id === "p3")!;
    expect(canView(s, p3)).toBe(true);
    expect(canView({ ...s, friends: [] }, p3)).toBe(false);
  });

  it("hides everything from a blocked author", () => {
    const s = seed();
    s.blocked = ["kabir"];
    expect(buildFeed(s, "foryou").some((p) => p.by === "kabir")).toBe(false);
  });

  it("Following is strictly chronological", () => {
    const s = seed();
    const mine: Post = { ...s.posts[0], id: "new", by: "me", ageMin: 0, createdAt: Date.now(), source: "me" };
    s.posts.push(mine);
    const f = buildFeed(s, "following");
    expect(f[0].id).toBe("new");
  });

  it("drops recommendations when personalisation is off", () => {
    const s = seed();
    s.privacy.personalised = false;
    expect(buildFeed(s, "foryou").some((p) => p.source === "rec")).toBe(false);
  });

  it("Show less moves an author to the bottom", () => {
    const s = seed();
    s.showLess = ["kabir"];
    const f = buildFeed(s, "foryou");
    expect(f.at(-1)?.by).toBe("kabir");
  });
});
