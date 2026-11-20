import type { FeedMode, Post, State } from "@/lib/types";

/**
 * Single policy enforcement point for whether the current user ("me") may
 * see a post. Every read path (feed, profile, search, community, deep link)
 * goes through this, as the blueprint's architecture rules require.
 */
export function canView(s: Pick<State, "friends" | "blocked">, p: Post): boolean {
  if (p.by === "me") return true;
  if (s.blocked.includes(p.by)) return false;
  switch (p.audience) {
    case "Public":
      return true;
    case "Friends":
    case "Close friends":
      return s.friends.includes(p.by);
    case "Only me":
      return false;
  }
}

/** Whether a post shows up in a feed-like list (adds personal filters on top of canView). */
export function isVisible(s: Pick<State, "friends" | "blocked" | "muted" | "hiddenPosts">, p: Post): boolean {
  return canView(s, p) && !s.muted.includes(p.by) && !s.hiddenPosts.includes(p.id);
}

const age = (p: Post, now: number) => (p.createdAt ? (now - p.createdAt) / 60000 : p.ageMin);

export function buildFeed(s: State, mode: FeedMode, now = Date.now()): Post[] {
  let ps = s.posts.filter((p) => isVisible(s, p));
  if (mode === "friends") {
    ps = ps.filter((p) => s.friends.includes(p.by) || p.by === "me");
  } else if (mode === "following") {
    // Strictly chronological: newest first, no ranking.
    ps = ps
      .filter((p) => s.following.includes(p.by) || p.by === "me")
      .sort((a, b) => age(a, now) - age(b, now));
  } else {
    if (!s.privacy.personalised) ps = ps.filter((p) => p.source !== "rec");
    // Stable sort: "Show less" authors drop below everyone else.
    ps = ps
      .map((p, i) => ({ p, i }))
      .sort((a, b) => Number(s.showLess.includes(a.p.by)) - Number(s.showLess.includes(b.p.by)) || a.i - b.i)
      .map((x) => x.p);
  }
  return ps;
}

export function ago(p: Post, now = Date.now()) {
  const m = Math.max(0, Math.round(age(p, now)));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
