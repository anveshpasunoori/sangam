"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Art, Avatar, Empty, Icon, Seg } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";

type Tab = "posts" | "saved" | "drafts";

function Thumbs({ posts }: { posts: Post[] }) {
  return (
    <div className="thumbs">
      {posts.map((p) => (
        <Link key={p.id} href={`/p/${p.id}`} aria-label={`Open post: ${p.text.slice(0, 40)}`}>
          {p.art ? <Art kind={p.art[0]} hue={p.art[1]} /> : <div className="tx">{p.text.slice(0, 70)}</div>}
        </Link>
      ))}
    </div>
  );
}

function ProfileInner() {
  const { state, update } = useStore();
  const { toast } = useUI();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "posts";
  const me = state.users.me;
  const mine = state.posts.filter((p) => p.by === "me");
  const saved = state.posts.filter((p) => state.saved.includes(p.id));

  return (
    <Screen
      title={`@${me.handle}`}
      back={false}
      actions={
        <Link className="icon" href="/settings" aria-label="Settings">
          <Icon name="gear" />
        </Link>
      }
    >
      <div className="profile-cover" aria-hidden="true"><div className="profile-cover-glow" /><span>MY SANGAM SPACE</span></div>
      <div className="pad stack profile-summary" style={{ background: "var(--surface)" }}>
        <div className="row g16">
          <span className="profile-avatar"><Avatar user={me} size={88} /></span>
          <div className="row g16 sp" style={{ justifyContent: "space-around", textAlign: "center" }}>
            {[
              [mine.length, "Posts"],
              [state.friends.length, "Friends"],
              [state.following.length, "Following"],
            ].map(([n, l]) => (
              <span key={l} className="col">
                <b className="stat num">{n}</b>
                <span className="meta">{l}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="profile-name">{me.name}</h2>
          <span className="meta">@{me.handle} · Your corner of Sangam</span>
          <p>{me.bio}</p>
        </div>
        <div className="row g8">
          <Link className="btn sec sm sp" href="/profile/edit">
            Edit profile
          </Link>
          <Link className="btn sec sm sp" href="/safety">
            <Icon name="shield" size={16} />
            Safety Center
          </Link>
        </div>
      </div>
      <Seg<Tab>
        label="Profile sections"
        options={[
          ["posts", "Posts"],
          ["saved", "Saved"],
          ["drafts", "Drafts"],
        ]}
        value={tab}
        onChange={(v) => router.replace(v === "posts" ? "/profile" : `/profile?tab=${v}`, { scroll: false })}
      />
      {tab === "posts" ? (
        mine.length ? (
          <Thumbs posts={mine} />
        ) : (
          <Empty icon="plus" title="No posts yet">
            <Link className="btn" href="/create">
              Create your first post
            </Link>
          </Empty>
        )
      ) : tab === "saved" ? (
        saved.length ? (
          <Thumbs posts={saved} />
        ) : (
          <Empty icon="bookmark" title="Nothing saved">
            <span>Saved posts are visible only to you.</span>
          </Empty>
        )
      ) : state.drafts.length ? (
        <div className="list">
          {state.drafts.map((d) => (
            <div key={d.id} className="li">
              <span className="col sp">
                <b>{d.text.slice(0, 60)}</b>
                <span className="meta">Draft · {d.audience}</span>
              </span>
              <button
                className="btn sm sec"
                onClick={() => {
                  update((s) => {
                    s.drafts = s.drafts.filter((x) => x.id !== d.id);
                    s.compose = { text: d.text, audience: d.audience, art: d.art, alt: d.alt, poll: d.poll, pollOptions: d.pollOptions };
                  });
                  router.push("/create");
                }}
              >
                Edit
              </button>
              <button
                className="icon"
                aria-label="Delete draft"
                onClick={() => {
                  update((s) => void (s.drafts = s.drafts.filter((x) => x.id !== d.id)));
                  toast("Draft deleted.");
                }}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="file" title="No drafts">
          <span>Drafts stay on this device until you publish.</span>
        </Empty>
      )}
    </Screen>
  );
}

export default function Profile() {
  return (
    <Suspense>
      <ProfileInner />
    </Suspense>
  );
}
