"use client";

import Link from "next/link";
import { stateTone } from "@/domain/civic";
import type { CivicCase, CivicState } from "@/lib/types";
import { Notice, StateChip } from "./ui";

export function CivicChip({ state }: { state: CivicState }) {
  return <StateChip state={state} tone={stateTone(state)} />;
}

export function CaseCard({ c }: { c: CivicCase }) {
  return (
    <Link className="card" href={`/civic/cases/${c.id}`}>
      <span className="row g8 wrap">
        <CivicChip state={c.state} />
        <span className="meta num">{c.ref}</span>
      </span>
      <h3 style={{ margin: "6px 0 2px" }}>{c.title}</h3>
      <span className="meta">
        {c.category} · {c.location}
      </span>
    </Link>
  );
}

export function CivicDisclaimer() {
  return (
    <Notice tone="t" icon="civic">
      <b>Sangam Civic helps you prepare, route and track a complaint.</b> It is not a government body and has no statutory powers. Official grievance
      channels remain the formal route.
    </Notice>
  );
}
