"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Empty, Icon, Notice, Seg } from "@/components/ui";
import { isVisible } from "@/domain/feed";
import { useStore } from "@/lib/store";
import type { Rsvp } from "@/lib/types";
import { joinLabel, useJoin } from "@/components/community";

type Tab = "Feed" | "Events" | "About";

export default function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const join = useJoin();
  const [tab, setTab] = useState<Tab>("Feed");
  const c = state.communities.find((x) => x.id === id);
  if (!c)
    return (
      <Screen title="Community">
        <Empty title="This community does not exist" />
      </Screen>
    );
  const canSee = c.privacy === "Public" || c.membership === "member";
  const posts = c.postIds.map((pid) => state.posts.find((p) => p.id === pid)).filter((p) => p && isVisible(state, p));

  return (
    <Screen title={c.name}>
      <div className="hero">
        <span className="chip" style={{ alignSelf: "flex-start" }}>
          {c.privacy} community · {c.members.toLocaleString("en-IN")} members
        </span>
        <p>{c.description}</p>
        <button className="btn sm" onClick={() => join(c)}>
          {joinLabel(c, true)}
        </button>
      </div>
      <Seg<Tab> label="Community sections" options={[["Feed", "Feed"], ["Events", "Events"], ["About", "About"]]} value={tab} onChange={setTab} />
      {!canSee && tab !== "About" ? (
        <Empty icon="lock" title="Members only">
          <span>
            {c.membership === "requested"
              ? "Your request is waiting for an admin. Nothing is approved automatically."
              : "Posts and events are visible after an admin approves your request."}
          </span>
        </Empty>
      ) : tab === "Feed" ? (
        posts.length ? (
          posts.map((p) => <PostCard key={p!.id} post={p!} />)
        ) : (
          <Empty title="No posts yet">
            <span>Be the first to share something with this community.</span>
          </Empty>
        )
      ) : tab === "Events" ? (
        <div className="pad stack">
          {c.events.length ? (
            c.events.map((e) => (
              <div key={e.id} className="card stack" style={{ gap: 8 }}>
                <h3>{e.title}</h3>
                <span className="meta row g8">
                  <Icon name="cal" size={16} />
                  {e.when}
                </span>
                <span className="meta row g8">
                  <Icon name="pin" size={16} />
                  {e.place}
                </span>
                <div className="row g8" role="group" aria-label="RSVP">
                  {(["Going", "Interested"] as Rsvp[]).map((o) => (
                    <button
                      key={o}
                      className="chip"
                      aria-pressed={e.rsvp === o}
                      onClick={() =>
                        update((d) => {
                          const ev = d.communities.find((x) => x.id === c.id)!.events.find((x) => x.id === e.id)!;
                          ev.rsvp = ev.rsvp === o ? null : o;
                        })
                      }
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="meta">No upcoming events.</p>
          )}
        </div>
      ) : (
        <div className="pad stack">
          <h3>Community rules</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {c.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <Notice>Admins moderate this space. Sangam’s platform guidelines still apply, and you can appeal platform decisions in the Safety Center.</Notice>
        </div>
      )}
    </Screen>
  );
}
