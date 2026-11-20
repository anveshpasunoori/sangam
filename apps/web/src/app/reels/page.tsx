"use client";

import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { ShareSheet, useSafetyActions } from "@/components/sheets";
import { useUI } from "@/components/UIProvider";
import { Art, Icon } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { toggle, useStore } from "@/lib/store";

export default function Reels() {
  const { state, update } = useStore();
  const { openSheet } = useUI();
  const safety = useSafetyActions();
  const [paused, setPaused] = useState<string[]>([]);
  const reels = state.reels.filter((r) => !state.blocked.includes(r.by) && !state.muted.includes(r.by));

  return (
    <Screen title="Reels" bare>
      <div className="reels">
        {reels.map((r) => {
          const u = state.users[r.by];
          const liked = state.liked.includes(r.id);
          return (
            <section key={r.id} className={`reel ${paused.includes(r.id) ? "paused" : ""}`} aria-label={`Reel by ${u.name}: ${r.title}`}>
              <div className="bgx">
                <Art kind={r.art[0]} hue={r.art[1]} animated />
              </div>
              <div className="hd">
                <span>{translate(state.prefs.lang, "reels")}</span>
                <span className="chip">Illustrated placeholder, no video</span>
              </div>
              <button className="tapz" aria-label="Play or pause" onClick={() => setPaused((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} />
              <div className="pausei">
                <Icon name="play" size={64} />
              </div>
              <div className="info">
                <b>
                  {u.name} · @{u.handle}
                </b>
                <span>{r.title}</span>
                {state.prefs.reelCaptions && <span className="cap">{r.caption}</span>}
                <span style={{ fontSize: ".8rem" }}>Original audio (fictional)</span>
              </div>
              <div className="side">
                <button aria-pressed={liked} aria-label="Like reel" onClick={() => update((d) => void toggle(d.liked, r.id))}>
                  <Icon name="heart" />
                  <span className="num">{r.likes + (liked ? 1 : 0)}</span>
                </button>
                <button aria-label="Share reel" onClick={() => openSheet("Share", (close) => <ShareSheet close={close} />)}>
                  <Icon name="share" />
                </button>
                <button
                  className="cc"
                  aria-pressed={state.prefs.reelCaptions}
                  aria-label={`Captions ${state.prefs.reelCaptions ? "on" : "off"}`}
                  onClick={() => update((d) => void (d.prefs.reelCaptions = !d.prefs.reelCaptions))}
                >
                  <Icon name="cc" />
                  <span>CC</span>
                </button>
                <button
                  aria-label="More options"
                  onClick={() =>
                    openSheet("Reel options", (close) => (
                      <>
                        <button className="btn sec" onClick={() => (close(), safety.mute(r.by))}>
                          Mute {u.name}
                        </button>
                        <button className="btn danger" onClick={() => (close(), safety.report("This reel"))}>
                          Report reel
                        </button>
                      </>
                    ))
                  }
                >
                  <Icon name="more" />
                </button>
              </div>
              <div className="bar">
                <i />
              </div>
            </section>
          );
        })}
      </div>
    </Screen>
  );
}
