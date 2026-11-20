"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { CaseCard, CivicDisclaimer } from "@/components/civic";
import { Icon } from "@/components/ui";
import { isTerminal } from "@/domain/civic";
import { translate } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function CivicHome() {
  const { state } = useStore();
  const open = state.cases.filter((c) => !isTerminal(c.state)).length;
  const waiting = state.cases.filter((c) => c.state === "RESOLUTION_REVIEW");
  return (
    <Screen title={translate(state.prefs.lang, "civic")}>
      <div className="hero t">
        <h2>Be heard, with evidence.</h2>
        <p>Report a local issue, attach proof, and follow every step of the case.</p>
        <Link className="btn" href="/civic/report">
          <Icon name="plus" size={18} />
          Report an issue
        </Link>
      </div>
      <div className="pad stack">
        <CivicDisclaimer />
        <div className="grid2">
          <Link className="card" href="/civic/cases">
            <span className="stat num">{state.cases.length}</span>
            <br />
            <b>My complaints</b>
            <br />
            <span className="meta">{open} open</span>
          </Link>
          <Link className="card" href="/civic/issues">
            <span className="stat num">{state.issues.length}</span>
            <br />
            <b>Community issues</b>
            <br />
            <span className="meta">Near Navapur (fictional)</span>
          </Link>
          <Link className="card" href="/civic/dashboard">
            <Icon name="info" />
            <br />
            <b>Accountability</b>
            <br />
            <span className="meta">Public dashboard</span>
          </Link>
          <Link className="card" href="/civic/help">
            <Icon name="scale" />
            <br />
            <b>Help and escalation</b>
            <br />
            <span className="meta">Your options</span>
          </Link>
        </div>
      </div>
      <div className="sec-h">Needs your attention</div>
      <div className="pad stack" style={{ paddingTop: 0 }}>
        {waiting.length ? waiting.map((c) => <CaseCard key={c.id} c={c} />) : <p className="meta">Nothing is waiting on you.</p>}
      </div>
    </Screen>
  );
}
