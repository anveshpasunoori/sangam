"use client";

import { Screen } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { isTerminal } from "@/domain/civic";
import { CIVIC_AGGREGATES as AGG } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function Dashboard() {
  const { state } = useStore();
  const total = AGG.reduce((a, x) => a + x[1], 0) + state.cases.length;
  const acked = AGG.reduce((a, x) => a + x[2], 0);
  const max = Math.max(...AGG.map((x) => x[1]));
  const unacked = AGG.reduce((a, x) => a + x[1] - x[2], 0);
  const days = AGG.map((x) => x[3]).sort((a, b) => a - b);
  const median = (days[2] + days[3]) / 2;
  const open = unacked + state.cases.filter((c) => !isTerminal(c.state)).length;

  return (
    <Screen title="Accountability">
      <div className="pad stack">
        <Notice tone="w">
          <b>Fictional demonstration figures</b> for the invented city of Navapur. They are not real statistics about any office.
        </Notice>
        <div className="grid2">
          {(
            [
              [total, "complaints, last 90 days"],
              [`${Math.round((acked / total) * 100)}%`, "with verified acknowledgement"],
              [`${median} days`, "median first response, across categories"],
              [open, "awaiting acknowledgement or open"],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="card">
              <span className="stat num">{v}</span>
              <br />
              <span className="meta">{l}</span>
            </div>
          ))}
        </div>
        <h3>By category</h3>
        <div
          className="stack"
          style={{ gap: 8 }}
          role="img"
          aria-label={`Bar chart of complaints by category. ${AGG.map((x) => `${x[0]}: ${x[1]} complaints, ${x[2]} acknowledged`).join(". ")}`}
        >
          {AGG.map((x) => (
            <div key={x[0]} className="barrow">
              <span>{x[0]}</span>
              <span className="tr">
                <b style={{ width: `${(x[2] / max) * 100}%` }} />
                <u style={{ width: `${((x[1] - x[2]) / max) * 100}%` }} />
              </span>
              <span className="num" style={{ textAlign: "right" }}>
                {x[1]}
              </span>
            </div>
          ))}
        </div>
        <div className="row g12 meta">
          <span className="row g4">
            <span style={{ width: 12, height: 12, background: "var(--teal)", borderRadius: 3 }} />
            Acknowledged
          </span>
          <span className="row g4">
            <span style={{ width: 12, height: 12, background: "var(--saffron-fill)", borderRadius: 3 }} />
            Not yet acknowledged
          </span>
        </div>
        <h3>How to read this</h3>
        <p className="meta">
          Coverage is limited to complaints filed through Sangam, so it under-counts issues reported elsewhere. An acknowledgement is counted only when verified
          through an official channel. A low count can mean few problems or few reports.
        </p>
      </div>
    </Screen>
  );
}
