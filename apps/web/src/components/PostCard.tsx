"use client";

import Link from "next/link";
import { toggle, useStore } from "@/lib/store";
import { ago } from "@/domain/feed";
import type { Post } from "@/lib/types";
import { Art, Avatar, Icon } from "./ui";
import { useUI } from "./UIProvider";
import { Comments, PostOptions, ShareSheet, WhySheet } from "./sheets";

export function PostCard({ post: p, showWhy = false }: { post: Post; showWhy?: boolean }) {
  const { state, update } = useStore();
  const { openSheet, toast } = useUI();
  const u = state.users[p.by];
  const liked = state.liked.includes(p.id);
  const saved = state.saved.includes(p.id);
  const translated = state.translated.includes(p.id);
  const likes = p.likes + (liked ? 1 : 0);
  const totalVotes = p.poll ? p.poll.options.reduce((a, o) => a + o.votes, 0) : 0;

  return (
    <article className="post" aria-label={`Post by ${u.name}`}>
      <header className="row g8">
        <Link href={p.by === "me" ? "/profile" : `/u/${u.id}`} className="row g8" style={{ minHeight: 44 }}>
          <Avatar user={u} />
          <span className="col">
            <b>
              {u.name} {u.verified && <span className="chip t">Verified</span>}
            </b>
            <span className="meta">
              @{u.handle} · {ago(p)} · {p.audience}
            </span>
          </span>
        </Link>
        <span className="sp" />
        <button className="icon" aria-label="More options for this post" onClick={() => openSheet("Post options", (close) => <PostOptions postId={p.id} close={close} />)}>
          <Icon name="more" />
        </button>
      </header>

      {p.poll ? (
        <div className="txt">
          {p.text}
          <div className="stack" style={{ marginTop: 10 }} role="group" aria-label={p.poll.question}>
            <b>{p.poll.question}</b>
            {p.poll.options.map((o, i) =>
              p.poll!.myVote === null ? (
                <button
                  key={i}
                  className="btn sec"
                  onClick={() =>
                    update((d) => {
                      const poll = d.posts.find((x) => x.id === p.id)!.poll!;
                      poll.myVote = i;
                      poll.options[i].votes++;
                    })
                  }
                >
                  {o.label}
                </button>
              ) : (
                <div key={i} className="barrow" style={{ gridTemplateColumns: "1fr 80px 40px" }}>
                  <span>
                    {o.label}
                    {p.poll!.myVote === i ? " (your vote)" : ""}
                  </span>
                  <span className="tr">
                    <b style={{ width: `${totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0}%` }} />
                  </span>
                  <span className="num">{totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0}%</span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <p className="txt" lang={p.lang}>
          {p.text}
        </p>
      )}

      {p.translation && (
        <div className="why">
          {translated ? (
            <span lang="en">
              {p.translation} <span className="chip">Demo translation</span>
            </span>
          ) : (
            <button onClick={() => update((d) => void d.translated.push(p.id))}>See translation</button>
          )}
        </div>
      )}

      {p.art &&
        (state.prefs.dataSaver ? (
          <div className="why">
            <span className="chip">Image hidden by Data saver</span>
          </div>
        ) : (
          <div className="art" title={p.alt || undefined}>
            <Art kind={p.art[0]} hue={p.art[1]} />
          </div>
        ))}

      {p.issueId && (
        <div className="row" style={{ padding: "0 16px", marginTop: 8 }}>
          <Link className="chip t" href={`/civic/issues/${p.issueId}`}>
            <Icon name="civic" size={14} />
            Linked civic issue
          </Link>
        </div>
      )}

      {showWhy && p.by !== "me" && (
        <div className="why" style={{ marginTop: 6 }}>
          {p.source === "rec" && <span className="chip s">Recommended</span>}
          <button onClick={() => openSheet("Why you are seeing this", (close) => <WhySheet postId={p.id} close={close} />)}>Why am I seeing this?</button>
        </div>
      )}

      <div className="acts">
        <button aria-pressed={liked} aria-label={`Like, ${likes} likes`} onClick={() => update((d) => void toggle(d.liked, p.id))}>
          <Icon name="heart" />
          <span className="num">{likes}</span>
        </button>
        <button aria-label={`Comments, ${p.comments.length}`} onClick={() => openSheet("Comments", () => <Comments postId={p.id} />)}>
          <Icon name="chat" />
          <span className="num">{p.comments.length}</span>
        </button>
        <button aria-label="Share" onClick={() => openSheet("Share", (close) => <ShareSheet postId={p.id} close={close} />)}>
          <Icon name="share" />
        </button>
        <span className="sp" />
        <button
          className="sv"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save post"}
          onClick={() => {
            update((d) => void toggle(d.saved, p.id));
            toast(saved ? "Removed from saved." : "Saved. Only you can see saved posts.");
          }}
        >
          <Icon name="bookmark" />
        </button>
      </div>
    </article>
  );
}
