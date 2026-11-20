"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { remove, useStore } from "@/lib/store";
import { screen } from "@/domain/screening";
import { Avatar, Icon, Notice } from "./ui";
import { useUI } from "./UIProvider";

export const REPORT_REASONS = [
  "Threat or violence",
  "Targeted harassment",
  "Hateful conduct",
  "Sexual content",
  "Impersonation",
  "Scam or spam",
  "Shares private information",
  "Something else",
];

export function ReportForm({ subject, close }: { subject: string; close: () => void }) {
  const { update, nextSeq } = useStore();
  const { toast } = useUI();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const id = `rp${nextSeq()}`;
        update((d) => void d.reports.unshift({ id, subject, reason }));
        close();
        toast("Report received. Track it in the Safety Center.");
      }}
    >
      <label className="f">
        What is wrong?
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REPORT_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="f">
        Add details (optional)
        <textarea maxLength={400} style={{ minHeight: 72 }} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>
      <Notice>Reports are confidential. The person you report is not told who reported them.</Notice>
      <button className="btn">Send report</button>
    </form>
  );
}

/** Mute / block / report actions shared by posts, reels and profiles. */
export function useSafetyActions() {
  const { state, update } = useStore();
  const { toast, openSheet } = useUI();
  return {
    mute(id: string) {
      update((d) => void (d.muted.includes(id) || d.muted.push(id)));
      toast(`${state.users[id].name} muted. They are not told.`);
    },
    block(id: string) {
      update((d) => {
        if (!d.blocked.includes(id)) d.blocked.push(id);
        remove(d.friends, id);
        remove(d.following, id);
        remove(d.friendRequests, id);
      });
      toast(`${state.users[id].name} blocked.`);
    },
    report(subject: string) {
      openSheet(`Report: ${subject}`, (close) => <ReportForm subject={subject} close={close} />);
    },
  };
}

export function PostOptions({ postId, close }: { postId: string; close: () => void }) {
  const { state, update } = useStore();
  const { toast } = useUI();
  const safety = useSafetyActions();
  const router = useRouter();
  const p = state.posts.find((x) => x.id === postId);
  if (!p) return <p className="meta">This post is no longer available.</p>;
  const u = state.users[p.by];
  if (p.by === "me")
    return (
      <button
        className="btn danger"
        onClick={() => {
          update((d) => void (d.posts = d.posts.filter((x) => x.id !== postId)));
          close();
          toast("Post deleted.");
          if (location.pathname.startsWith("/p/")) router.push("/profile");
        }}
      >
        Delete post
      </button>
    );
  return (
    <>
      <button
        className="btn sec"
        onClick={() => {
          update((d) => void d.hiddenPosts.push(postId));
          close();
          toast("Hidden. You will see fewer posts like this.");
        }}
      >
        Not interested
      </button>
      <ShowLessButton author={p.by} close={close} label={`Show less from ${u.name}`} />
      <button className="btn sec" onClick={() => (close(), safety.mute(u.id))}>
        Mute {u.name}
      </button>
      <button className="btn danger" onClick={() => (close(), safety.block(u.id))}>
        Block {u.name}
      </button>
      <button className="btn danger" onClick={() => (close(), safety.report("This post"))}>
        Report post
      </button>
    </>
  );
}

function ShowLessButton({ author, close, label }: { author: string; close: () => void; label: string }) {
  const { update } = useStore();
  const { toast } = useUI();
  return (
    <button
      className="btn sec"
      onClick={() => {
        update((d) => void (d.showLess.includes(author) || d.showLess.push(author)));
        close();
        toast("Got it. Posts from this account are ranked lower in For You.");
      }}
    >
      {label}
    </button>
  );
}

export function WhySheet({ postId, close }: { postId: string; close: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const p = state.posts.find((x) => x.id === postId)!;
  return (
    <>
      <p>
        <b>{p.why}.</b>
      </p>
      <p className="meta">
        For You ranks posts from friends, people you follow, your communities and, where labelled, recommendations. It does not use your private
        messages.
      </p>
      <ShowLessButton author={p.by} close={close} label="Show less like this" />
      <button className="btn sec" onClick={() => (close(), router.push("/settings"))}>
        Recommendation settings
      </button>
    </>
  );
}

export function ShareSheet({ postId, close }: { postId?: string; close: () => void }) {
  const { toast } = useUI();
  const router = useRouter();
  const url = postId ? `${location.origin}/p/${postId}` : location.href;
  return (
    <>
      <button
        className="btn sec"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast("Link copied.");
          } catch {
            toast(`Copying is not available here. Link: ${url}`);
          }
          close();
        }}
      >
        Copy link
      </button>
      {postId && (
        <button
          className="btn sec"
          onClick={() => {
            close();
            router.push("/messages");
            toast("Choose a chat, then send the post link.");
          }}
        >
          Send in a message
        </button>
      )}
      <Notice>Sharing respects the original audience. A Friends-only post cannot be opened by people outside that audience.</Notice>
    </>
  );
}

export function Comments({ postId }: { postId: string }) {
  const { state, update } = useStore();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const p = state.posts.find((x) => x.id === postId);
  if (!p) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    const r = screen(v);
    if (r.verdict !== "allow") {
      setErr(`${r.reason} Edit it and try again.`);
      return;
    }
    update((d) => void d.posts.find((x) => x.id === postId)!.comments.push({ by: "me", text: v }));
    setText("");
    setErr("");
  };
  return (
    <div className="stack">
      {p.comments.length ? (
        p.comments.map((c, i) => (
          <div key={i} className="row g8" style={{ alignItems: "flex-start" }}>
            <Avatar user={state.users[c.by]} size={32} />
            <div className="col">
              <b style={{ fontSize: ".85rem" }}>{state.users[c.by].name}</b>
              <span>{c.text}</span>
            </div>
          </div>
        ))
      ) : (
        <p className="meta">No comments yet.</p>
      )}
      <form className="row g8" noValidate onSubmit={submit}>
        <label className="vh" htmlFor={`cm-${postId}`}>
          Add a comment
        </label>
        <input type="text" id={`cm-${postId}`} placeholder="Add a comment" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" aria-label="Post comment">
          <Icon name="send" size={18} />
        </button>
      </form>
      <p className="err-t" role="alert">
        {err}
      </p>
    </div>
  );
}
