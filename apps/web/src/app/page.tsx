"use client";

import Link from "next/link";
import { HomeHeader, Screen } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { useUI } from "@/components/UIProvider";
import { Avatar, Empty, Seg } from "@/components/ui";
import { buildFeed } from "@/domain/feed";
import { translate } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { FeedMode } from "@/lib/types";

export default function Home() {
  const { state, update } = useStore();
  const { setStory } = useUI();
  const t = (k: Parameters<typeof translate>[1]) => translate(state.prefs.lang, k);
  const mode = state.feedMode;
  const posts = buildFeed(state, mode);
  const note =
    mode === "foryou"
      ? state.privacy.personalised
        ? "Personalised. Recommendations are labelled."
        : "Personalisation is off. Showing people you know and follow."
      : mode === "friends"
        ? "Only confirmed friends."
        : "Newest first, with no ranking.";

  return (
    <>
      <HomeHeader />
      <Screen title="" bare>
        <div className="stories" aria-label="Stories">
          {state.stories.map((s, i) => {
            const u = state.users[s.by];
            if (state.blocked.includes(s.by)) return null;
            return (
              <button key={i} aria-label={`Story from ${u.name}`} onClick={() => setStory(i)}>
                <span className={`ring ${state.seenStories.includes(i) ? "seen" : ""}`}>
                  <Avatar user={u} size={48} />
                </span>
                <span>{u.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        <Seg<FeedMode>
          label="Feed"
          options={[
            ["foryou", t("foryou")],
            ["friends", t("friends")],
            ["following", t("following")],
          ]}
          value={mode}
          onChange={(v) => update((d) => void (d.feedMode = v))}
        />
        <div className="why" style={{ padding: "8px 16px", margin: 0 }}>
          {note}
        </div>
        {posts.length ? (
          posts.map((p) => <PostCard key={p.id} post={p} showWhy={mode === "foryou"} />)
        ) : (
          <Empty icon="home" title="Nothing here yet">
            <span>Follow people or switch feeds to see posts.</span>
            <Link className="btn sec" href="/search">
              Find people
            </Link>
          </Empty>
        )}
        <div className="empty meta">You have reached the end. All posts are fictional demo content.</div>
      </Screen>
    </>
  );
}
