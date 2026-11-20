"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { useSafetyActions } from "@/components/sheets";
import { Icon, Notice } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { ModStatus } from "@/lib/types";

const modTone = (s: ModStatus) =>
  s === "Restored on appeal" || s === "Published after review" ? "ok" : s === "Appeal submitted" || s === "Held for review" ? "s" : "e";

export default function Safety() {
  const { state } = useStore();
  const safety = useSafetyActions();
  return (
    <Screen title="Safety Center">
      <div className="pad stack">
        <p>Tools to protect yourself and to challenge decisions about your account.</p>
        <Notice>No system catches everything. Sangam works to reduce abuse and to correct its own mistakes quickly.</Notice>
      </div>

      <div className="sec-h">Report a problem</div>
      <div className="list">
        {["Abuse or threats", "Impersonation", "Harassment"].map((x) => (
          <button key={x} className="li" onClick={() => safety.report(x)}>
            <Icon name="flag" />
            <span className="sp">
              <b>Report {x.toLowerCase()}</b>
            </span>
            <Icon name="right" size={18} />
          </button>
        ))}
      </div>

      <div className="sec-h">Decisions about your content</div>
      <div className="list">
        {state.decisions.map((m) => (
          <Link key={m.id} className="li" href={`/safety/decisions/${m.id}`}>
            <Icon name="shield" />
            <span className="col sp">
              <b>{m.what}</b>
              <span className="meta">
                {m.rule} · {m.decidedBy}
              </span>
            </span>
            <span className={`chip ${modTone(m.status)}`}>{m.status}</span>
          </Link>
        ))}
      </div>

      <div className="sec-h">Your reports</div>
      {state.reports.length ? (
        <div className="list">
          {state.reports.map((r) => (
            <div key={r.id} className="li">
              <Icon name="flag" />
              <span className="col sp">
                <b>{r.subject}</b>
                <span className="meta">{r.reason}</span>
              </span>
              <span className="chip s">Received</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="pad meta" style={{ paddingTop: 0 }}>
          You have not reported anything.
        </p>
      )}

      <div className="sec-h">Guidelines in brief</div>
      <div className="pad stack" style={{ paddingTop: 0 }}>
        <div className="card stack" style={{ gap: 6 }}>
          <b>Not allowed</b>
          <span className="meta">
            Threats, targeted harassment, hateful conduct, sexual exploitation and pornography, impersonation, scams, spam, doxxing, intimate images shared
            without consent, malicious links, coordinated manipulation.
          </span>
          <b>Always protected</b>
          <span className="meta">Criticism, satire, reporting, peaceful disagreement and public-interest speech. Negative is not the same as abusive.</span>
        </div>
        <div className="list" style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)" }}>
          <Link className="li" href="/settings/blocked">
            <Icon name="lock" />
            <span className="sp">
              <b>Blocked and muted</b>
            </span>
            <Icon name="right" size={18} />
          </Link>
          <Link className="li" href="/ombudsman">
            <Icon name="scale" />
            <span className="sp">
              <b>Platform Ombudsman</b>
            </span>
            <Icon name="right" size={18} />
          </Link>
        </div>
      </div>
    </Screen>
  );
}
