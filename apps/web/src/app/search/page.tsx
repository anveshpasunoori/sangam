"use client";

import Link from "next/link";
import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Avatar, Empty, Seg } from "@/components/ui";
import { isVisible } from "@/domain/feed";
import { translate } from "@/lib/i18n";
import { TRENDING_TAGS } from "@/lib/seed";
import { useStore } from "@/lib/store";

type Tab = "All" | "People" | "Posts" | "Communities" | "Tags";

export default function Search() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("All");
  const query = q.trim().toLowerCase();

  const people = Object.values(state.users).filter(
    (u) => u.id !== "me" && !state.blocked.includes(u.id) && `${u.name} ${u.handle} ${u.bio}`.toLowerCase().includes(query),
  );
  const posts = state.posts.filter((p) => isVisible(state, p) && `${p.text} ${p.translation ?? ""}`.toLowerCase().includes(query));
  const comms = state.communities.filter((c) => `${c.name} ${c.description}`.toLowerCase().includes(query));
  const tags = TRENDING_TAGS.filter((x) => x.toLowerCase().includes(query.replace("#", "")));
  const show = (t: Tab) => tab === "All" || tab === t;
  const any = (show("People") && people.length) || (show("Posts") && posts.length) || (show("Communities") && comms.length) || (show("Tags") && tags.length);

  return (
    <Screen title={translate(state.prefs.lang, "search")}>
      <div className="pad" style={{ background: "var(--surface)" }}>
        <label className="vh" htmlFor="q">
          Search Sangam
        </label>
        <input type="search" id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="People, posts, communities, tags" autoComplete="off" autoFocus />
      </div>
      <Seg<Tab> label="Result types" options={(["All", "People", "Posts", "Communities", "Tags"] as Tab[]).map((t) => [t, t])} value={tab} onChange={setTab} />
      {!query ? (
        <>
          <div className="sec-h">Trending in your communities</div>
          <div className="pad row g8 wrap" style={{ paddingTop: 0 }}>
            {TRENDING_TAGS.map((x) => (
              <button key={x} className="chip" onClick={() => setQ(x)}>
                {x}
              </button>
            ))}
          </div>
          <p className="pad meta">Trends are fictional. Search works across people, posts, communities and tags, in English, Hindi and Telugu text.</p>
        </>
      ) : !any ? (
        <Empty icon="search" title={`No results for “${q}”`}>
          <span>Check the spelling or try another tab.</span>
        </Empty>
      ) : (
        <>
          {show("People") && people.length > 0 && (
            <>
              <div className="sec-h">People</div>
              <div className="list">
                {people.map((u) => (
                  <Link key={u.id} className="li" href={`/u/${u.id}`}>
                    <Avatar user={u} />
                    <span className="col">
                      <b>{u.name}</b>
                      <span className="meta">@{u.handle}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {show("Communities") && comms.length > 0 && (
            <>
              <div className="sec-h">Communities</div>
              <div className="list">
                {comms.map((c) => (
                  <Link key={c.id} className="li" href={`/communities/${c.id}`}>
                    <Avatar user={{ name: c.name, hue: c.hue }} />
                    <span className="col">
                      <b>{c.name}</b>
                      <span className="meta">{c.privacy}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {show("Tags") && tags.length > 0 && (
            <>
              <div className="sec-h">Tags</div>
              <div className="pad row g8 wrap" style={{ paddingTop: 0 }}>
                {tags.map((x) => (
                  <span key={x} className="chip p">
                    {x}
                  </span>
                ))}
              </div>
            </>
          )}
          {show("Posts") && posts.length > 0 && (
            <>
              <div className="sec-h">Posts</div>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
