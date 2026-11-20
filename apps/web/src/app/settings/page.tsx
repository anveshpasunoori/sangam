"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { ChipGroup, Icon, Toggle } from "@/components/ui";
import { LANGS } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Audience, Lang, Theme } from "@/lib/types";

export default function Settings() {
  const { state, update, reset } = useStore();
  const { toast, openSheet } = useUI();
  const { prefs, privacy } = state;

  return (
    <Screen title="Settings">
      <div className="sec-h">Appearance and accessibility</div>
      <div className="list">
        <div className="sw">
          <b className="sp">Theme</b>
          <ChipGroup<Theme>
            id="s-th"
            label="Theme"
            options={[
              ["system", "System"],
              ["light", "Light"],
              ["dark", "Dark"],
            ]}
            value={prefs.theme}
            onChange={(v) => update((d) => void (d.prefs.theme = v))}
          />
        </div>
        <div className="sw">
          <b className="sp">Text size</b>
          <ChipGroup<number>
            id="s-tx"
            label="Text size"
            options={[
              [0.9, "Small"],
              [1, "Default"],
              [1.15, "Large"],
              [1.3, "Largest"],
            ]}
            value={prefs.scale}
            onChange={(v) => update((d) => void (d.prefs.scale = v))}
          />
        </div>
        <div className="sw">
          <span className="col sp">
            <b>Language</b>
            <span className="meta">Navigation labels are translated in this build.</span>
          </span>
          <ChipGroup<Lang>
            id="s-lg"
            label="Language"
            options={LANGS.map(([l, n]) => [l, <span key={l} lang={l}>{n}</span>])}
            value={prefs.lang}
            onChange={(v) => update((d) => void (d.prefs.lang = v))}
          />
        </div>
        <Toggle id="reduced" label="Reduce motion" sub="Stops reel and story animation" on={prefs.reducedMotion} onChange={() => update((d) => void (d.prefs.reducedMotion = !d.prefs.reducedMotion))} />
        <Toggle id="saver" label="Data saver" sub="Hides images in feeds until you ask" on={prefs.dataSaver} onChange={() => update((d) => void (d.prefs.dataSaver = !d.prefs.dataSaver))} />
        <Toggle id="offline" label="Simulate offline" sub="Shows the offline state for testing" on={prefs.offline} onChange={() => update((d) => void (d.prefs.offline = !d.prefs.offline))} />
      </div>

      <div className="sec-h">Privacy</div>
      <div className="list">
        <div className="sw">
          <b className="sp">Default audience</b>
          <ChipGroup<Audience>
            id="s-au"
            label="Default audience"
            options={(["Public", "Friends", "Only me"] as Audience[]).map((a) => [a, a])}
            value={privacy.defaultAudience}
            onChange={(v) => update((d) => void (d.privacy.defaultAudience = v))}
          />
        </div>
        <div className="sw">
          <b className="sp">Who can message you</b>
          <ChipGroup<"Everyone" | "Friends">
            id="s-dm"
            label="Who can message you"
            options={[
              ["Everyone", "Everyone"],
              ["Friends", "Friends"],
            ]}
            value={privacy.whoCanMessage}
            onChange={(v) => update((d) => void (d.privacy.whoCanMessage = v))}
          />
        </div>
        <Toggle id="local" label="Appear in local discovery" sub="Off unless you turn it on" on={privacy.localDiscovery} onChange={() => update((d) => void (d.privacy.localDiscovery = !d.privacy.localDiscovery))} />
        <Toggle id="personal" label="Personalised recommendations" sub="For You uses your activity" on={privacy.personalised} onChange={() => update((d) => void (d.privacy.personalised = !d.privacy.personalised))} />
        <button
          className="li"
          onClick={() => {
            update((d) => {
              d.showLess = [];
              d.hiddenPosts = [];
              d.liked = [];
            });
            toast("Recommendations reset.");
          }}
        >
          <Icon name="info" />
          <span className="col sp">
            <b>Reset recommendations</b>
            <span className="meta">Clears Show less, Not interested and likes used for ranking</span>
          </span>
        </button>
        <Link className="li" href="/settings/blocked">
          <Icon name="lock" />
          <span className="sp">
            <b>Blocked and muted</b>
          </span>
          <span className="meta num">{state.blocked.length + state.muted.length}</span>
          <Icon name="right" size={18} />
        </Link>
      </div>

      <div className="sec-h">Trust</div>
      <div className="list">
        {(
          [
            ["/safety", "shield", "Safety Center"],
            ["/ombudsman", "scale", "Platform Ombudsman"],
            ["/civic", "civic", "Sangam Civic"],
          ] as const
        ).map(([href, icon, label]) => (
          <Link key={href} className="li" href={href}>
            <Icon name={icon} />
            <span className="sp">
              <b>{label}</b>
            </span>
            <Icon name="right" size={18} />
          </Link>
        ))}
      </div>

      <div className="sec-h">Data</div>
      <div className="list">
        <button
          className="li"
          onClick={() =>
            openSheet("Reset all data?", (close) => (
              <>
                <p>Your posts, drafts, complaints, settings and every other change in this browser will be replaced with the starting demo data.</p>
                <button
                  className="btn danger"
                  onClick={() => {
                    reset();
                    close();
                    toast("All data reset.");
                  }}
                >
                  Reset everything
                </button>
                <button className="btn sec" onClick={close}>
                  Keep my data
                </button>
              </>
            ))
          }
        >
          <Icon name="close" />
          <span className="col sp">
            <b>Reset all data</b>
            <span className="meta">Everything is stored only in this browser</span>
          </span>
        </button>
      </div>
      <p className="pad meta">Nothing is stored on a server in this build.</p>
    </Screen>
  );
}
