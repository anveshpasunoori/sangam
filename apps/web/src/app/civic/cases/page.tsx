"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { CaseCard } from "@/components/civic";
import { Empty, Icon } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function MyComplaints() {
  const { state } = useStore();
  const draft = state.civicDraft;
  return (
    <Screen
      title="My complaints"
      actions={
        <Link className="icon" href="/civic/report" aria-label="Report an issue">
          <Icon name="plus" />
        </Link>
      }
    >
      <div className="pad stack">
        {draft && (draft.title || draft.category) && (
          <Link className="card" href="/civic/report">
            <span className="chip">DRAFT</span>
            <h3 style={{ margin: "6px 0 2px" }}>{draft.title || draft.category}</h3>
            <span className="meta">Continue where you stopped</span>
          </Link>
        )}
        {state.cases.length ? (
          state.cases.map((c) => <CaseCard key={c.id} c={c} />)
        ) : (
          <Empty title="No complaints yet">
            <Link className="btn" href="/civic/report">
              Report an issue
            </Link>
          </Empty>
        )}
      </div>
    </Screen>
  );
}
