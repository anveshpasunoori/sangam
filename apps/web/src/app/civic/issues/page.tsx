"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { CivicChip } from "@/components/civic";
import { Notice } from "@/components/ui";
import { toggle, useStore } from "@/lib/store";

export default function Issues() {
  const { state, update } = useStore();
  return (
    <Screen title="Community issues">
      <div className="pad stack">
        <Notice>Public summaries only. Complainant identities and original evidence are hidden. Demo data.</Notice>
        {state.issues.map((i) => {
          const mine = state.supported.includes(i.id);
          return (
            <div key={i.id} className="card stack" style={{ gap: 8 }}>
              <Link href={`/civic/issues/${i.id}`}>
                <span className="row g8 wrap">
                  <CivicChip state={i.state} />
                  <span className="chip">{i.category}</span>
                </span>
                <h3 style={{ marginTop: 6 }}>{i.title}</h3>
                <span className="meta">
                  {i.ward} · {i.affected + (mine ? 1 : 0)} people affected
                </span>
              </Link>
              <button className={`btn sm ${mine ? "sec" : ""}`} aria-pressed={mine} style={{ alignSelf: "flex-start" }} onClick={() => update((d) => void toggle(d.supported, i.id))}>
                {mine ? "You are affected too" : "I am affected too"}
              </button>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
