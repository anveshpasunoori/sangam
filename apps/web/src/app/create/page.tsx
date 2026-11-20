"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Art, Icon, Notice, Toggle } from "@/components/ui";
import { screen } from "@/domain/screening";
import { useStore } from "@/lib/store";
import type { ArtKind, Audience, Compose } from "@/lib/types";

const AUDIENCES: Audience[] = ["Public", "Friends", "Close friends", "Only me"];
const ARTS: ArtKind[] = ["hills", "kolam", "lake", "city"];
const EMPTY: Compose = { text: "", audience: null, art: null, alt: "", poll: false, pollOptions: ["", ""] };

export default function Create() {
  const { state, update, nextSeq } = useStore();
  const { openSheet, toast, closeSheet } = useUI();
  const router = useRouter();
  const c = state.compose;
  const audience = c.audience ?? state.privacy.defaultAudience;
  const [err, setErr] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const set = (fn: (d: Compose) => void) => update((s) => fn(s.compose));

  function saveDraft() {
    if (!c.text.trim()) {
      setErr("There is nothing to save yet.");
      return false;
    }
    const id = `dr${nextSeq()}`;
    update((s) => {
      s.drafts.unshift({ id, text: c.text, audience, art: c.art, alt: c.alt, poll: c.poll, pollOptions: [...c.pollOptions] });
      s.compose = structuredClone(EMPTY);
    });
    return true;
  }

  function holdForReview() {
    const id = `d${nextSeq()}`;
    update((s) => {
      s.decisions.unshift({
        id,
        what: "Your post, held before publishing",
        quote: c.text,
        rule: "Possible harassment or private information",
        decidedBy: "Automated screening",
        status: "Held for review",
        log: [{ date: "Today", text: "Held by the pre-publish check at your request for human review. Not visible to anyone." }],
      });
      s.compose = structuredClone(EMPTY);
    });
    closeSheet();
    router.push(`/safety/decisions/${id}`);
  }

  function publish(e: FormEvent) {
    e.preventDefault();
    const text = c.text.trim();
    if (!text) {
      setErr("Write something before publishing.");
      textRef.current?.focus();
      return;
    }
    if (c.poll && (!c.pollOptions[0].trim() || !c.pollOptions[1].trim())) {
      setErr("Fill in both poll options, or turn the poll off.");
      return;
    }
    if (state.prefs.offline) {
      if (saveDraft()) {
        toast("You are offline. Saved to drafts.");
        router.push("/profile?tab=drafts");
      }
      return;
    }
    const r = screen(text);
    if (r.verdict === "revise") {
      openSheet("Take another look?", (close) => (
        <>
          <p>{r.reason}</p>
          <Notice tone="w">Your meaning is yours to keep. You can edit the wording, or ask for a human review if you think the check is wrong.</Notice>
          <button className="btn" onClick={close}>
            Edit post
          </button>
          <button className="btn sec" onClick={holdForReview}>
            Send for human review
          </button>
        </>
      ));
      return;
    }
    const id = `p${nextSeq()}`;
    update((s) => {
      s.posts.unshift({
        id,
        by: "me",
        ageMin: 0,
        createdAt: Date.now(),
        source: "me",
        audience,
        text,
        art: c.art ? [c.art, s.seq % 4] : null,
        alt: c.alt,
        poll: c.poll ? { question: "Poll", options: c.pollOptions.map((label) => ({ label, votes: 0 })), myVote: null } : null,
        likes: 0,
        comments: [],
        why: "",
      });
      s.compose = structuredClone(EMPTY);
    });
    toast(`Posted to ${audience}.`);
    router.push("/");
  }

  return (
    <Screen title="Create post" back={false}>
      <form className="pad stack" noValidate onSubmit={publish}>
        <label className="f">
          What would you like to share?
          <textarea ref={textRef} maxLength={500} placeholder="Write in any language" value={c.text} onChange={(e) => set((d) => void (d.text = e.target.value))} />
        </label>
        <div className="stack" style={{ gap: 6 }}>
          <b style={{ fontSize: ".85rem" }} id="c-aud">
            Who can see this
          </b>
          <div className="row g8 wrap" role="group" aria-labelledby="c-aud">
            {AUDIENCES.map((a) => (
              <button key={a} type="button" className="chip" aria-pressed={audience === a} onClick={() => set((d) => void (d.audience = a))}>
                {a === "Public" && <Icon name="globe" size={14} />}
                {a === "Only me" && <Icon name="lock" size={14} />}
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <b style={{ fontSize: ".85rem" }} id="c-art">
            Add an image (sample illustrations)
          </b>
          <div className="row g8" role="group" aria-labelledby="c-art">
            {ARTS.map((k, i) => (
              <button
                key={k}
                type="button"
                aria-pressed={c.art === k}
                aria-label={`${k} illustration`}
                onClick={() => set((d) => void (d.art = d.art === k ? null : k))}
                style={{ width: 64, height: 48, padding: 0, borderRadius: 8, overflow: "hidden", border: `3px solid ${c.art === k ? "var(--primary)" : "var(--line)"}` }}
              >
                <Art kind={k} hue={i} />
              </button>
            ))}
          </div>
        </div>
        {c.art && (
          <label className="f">
            Image description for screen readers
            <input type="text" value={c.alt} placeholder="Describe what the image shows" onChange={(e) => set((d) => void (d.alt = e.target.value))} />
          </label>
        )}
        <div className="card" style={{ padding: 0 }}>
          <Toggle id="cpoll" label="Add a poll" sub="Two options" on={c.poll} onChange={() => set((d) => void (d.poll = !d.poll))} />
        </div>
        {c.poll &&
          ([0, 1] as const).map((i) => (
            <label key={i} className="f">
              Option {i + 1}
              <input type="text" value={c.pollOptions[i]} onChange={(e) => set((d) => void (d.pollOptions[i] = e.target.value))} />
            </label>
          ))}
        <p className="err-t" role="alert">
          {err}
        </p>
        <Notice>
          Before publishing, posts pass a check. In this build it is a small keyword rule on your device, standing in for the multilingual model. Criticism of
          institutions and decisions is allowed.
        </Notice>
        <div className="row g8">
          <button
            type="button"
            className="btn sec sp"
            onClick={() => {
              if (saveDraft()) router.push("/profile?tab=drafts");
            }}
          >
            Save draft
          </button>
          <button className="btn sp">Publish</button>
        </div>
      </form>
    </Screen>
  );
}
