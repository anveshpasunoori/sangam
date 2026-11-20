"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { CivicChip } from "@/components/civic";
import { Empty, Notice } from "@/components/ui";
import { toggle, useStore } from "@/lib/store";

export default function IssuePage() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const i = state.issues.find((x) => x.id === id);
  if (!i)
    return (
      <Screen title="Community issue">
        <Empty title="This issue does not exist" />
      </Screen>
    );
  const mine = state.supported.includes(i.id);
  return (
    <Screen title="Community issue">
      <div className="pad stack">
        <div className="row g8 wrap">
          <CivicChip state={i.state} />
          <span className="chip">{i.category}</span>
        </div>
        <h2>{i.title}</h2>
        <span className="meta">{i.ward}, Navapur (fictional)</span>
        <div className="grid2">
          <div className="card">
            <span className="stat num">{i.affected + (mine ? 1 : 0)}</span>
            <br />
            <span className="meta">people affected</span>
          </div>
          <div className="card">
            <b>{i.acknowledged ? "Acknowledged" : "Not acknowledged"}</b>
            <br />
            <span className="meta">{i.acknowledged ? "Simulated for the demo" : "No verified official acknowledgement"}</span>
          </div>
        </div>
        <button className={`btn ${mine ? "sec" : ""}`} aria-pressed={mine} onClick={() => update((d) => void toggle(d.supported, i.id))}>
          {mine ? "You are affected too" : "I am affected too"}
        </button>
        {i.myCaseId && state.cases.some((c) => c.id === i.myCaseId) && (
          <Link className="btn sec" href={`/civic/cases/${i.myCaseId}`}>
            Open my complaint
          </Link>
        )}
        <Notice>Statements on this page are residents’ allegations unless marked as reviewed evidence or an official response.</Notice>
      </div>
    </Screen>
  );
}
