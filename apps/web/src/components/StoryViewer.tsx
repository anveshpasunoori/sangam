"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "./UIProvider";
import { Art, Avatar, Icon } from "./ui";

export function StoryViewer() {
  const { story, setStory } = useUI();
  const { state, update } = useStore();
  const closeRef = useRef<HTMLButtonElement>(null);
  const n = state.stories.length;

  useEffect(() => {
    if (story === null) return;
    if (story < 0 || story >= n) {
      setStory(null);
      return;
    }
    update((d) => {
      if (!d.seenStories.includes(story)) d.seenStories.push(story);
    });
    closeRef.current?.focus();
    const reduce = state.prefs.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = reduce ? null : setTimeout(() => setStory(story + 1), 5000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStory(null);
      if (e.key === "ArrowRight") setStory(story + 1);
      if (e.key === "ArrowLeft") setStory(Math.max(0, story - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  if (story === null || story < 0 || story >= n) return null;
  const s = state.stories[story];
  const u = state.users[s.by];
  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={`Story from ${u.name}`}>
      <div className="story-inner">
        <div className="bars">
          {state.stories.map((_, j) => (
            <span key={`${story}-${j}`} className={j < story ? "done" : j === story ? "cur" : ""}>
              <i />
            </span>
          ))}
        </div>
        <div className="row g8" style={{ padding: "8px 12px" }}>
          <Avatar user={u} size={36} />
          <b className="sp">{u.name}</b>
          <button ref={closeRef} className="icon" aria-label="Close story" onClick={() => setStory(null)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="body">
          <Art kind={s.art[0]} hue={s.art[1]} />
          <p>{s.text}</p>
          <button className="nav" style={{ left: 0 }} aria-label="Previous story" onClick={() => setStory(Math.max(0, story - 1))} />
          <button className="nav" style={{ right: 0 }} aria-label="Next story" onClick={() => setStory(story + 1)} />
        </div>
      </div>
    </div>
  );
}
