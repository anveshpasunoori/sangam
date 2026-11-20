"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Empty, Notice, Timeline } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { ModDecision, ModStatus } from "@/lib/types";

const tone = (s: ModStatus) => (s === "Restored on appeal" || s === "Published after review" ? "ok" : "s");

export default function Decision() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const { toast } = useUI();
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const m = state.decisions.find((x) => x.id === id);
  if (!m)
    return (
      <Screen title="Moderation decision">
        <Empty title="This decision does not exist" />
      </Screen>
    );
  const edit = (fn: (x: ModDecision) => void) => update((d) => fn(d.decisions.find((x) => x.id === id)!));
  const restored = m.status === "Restored on appeal" || m.status === "Published after review";

  return (
    <Screen title="Moderation decision">
      <div className="pad stack">
        <span className={`chip ${tone(m.status)}`} style={{ alignSelf: "flex-start" }}>
          {m.status}
        </span>
        <h2>{m.what}</h2>
        <blockquote className="card">{m.quote}</blockquote>
        <div className="grid2">
          <div className="card">
            <span className="meta">Rule cited</span>
            <br />
            <b>{m.rule}</b>
          </div>
          <div className="card">
            <span className="meta">Decided by</span>
            <br />
            <b>{m.decidedBy}</b>
          </div>
        </div>

        {m.status === "Hidden" && (
          <form
            className="stack"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const v = reason.trim();
              if (v.length < 10) return setErr("Explain your reason in at least 10 characters.");
              edit((x) => {
                x.status = "Appeal submitted";
                x.log.push({ date: "Today", text: `You appealed: “${v}”` });
              });
              setReason("");
              setErr("");
              toast("Appeal submitted.");
            }}
          >
            <label className="f">
              Why should this be reviewed?
              <textarea maxLength={500} placeholder="For example: this criticises a decision, not a person." value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <p className="err-t" role="alert">
              {err}
            </p>
            <button className="btn">Submit appeal</button>
          </form>
        )}

        {(m.status === "Appeal submitted" || m.status === "Held for review") && (
          <>
            <button
              className="btn"
              onClick={() =>
                edit((x) => {
                  x.decidedBy = "Human reviewer (simulated)";
                  if (x.status === "Held for review") {
                    x.status = "Published after review";
                    x.log.push({ date: "Today", text: "Simulated human review: wording found to be within the guidelines. In the real product the post would now publish." });
                  } else {
                    x.status = "Restored on appeal";
                    x.log.push({
                      date: "Today",
                      text: "Simulated human review: the comment criticises a decision, not a person. Restored, and the error is logged to improve screening.",
                    });
                  }
                })
              }
            >
              Simulate human review
            </button>
            <p className="meta">Stands in for a trained reviewer. In the real product a person makes this decision.</p>
          </>
        )}

        {restored && (
          <>
            <Notice tone="t" icon="scale">
              If you believe this was handled unfairly or too slowly, you can ask the independent Ombudsman to review how the platform acted.
            </Notice>
            <Link className="btn sec" href="/ombudsman/new">
              Complain to the Ombudsman
            </Link>
          </>
        )}

        <h3>History</h3>
        <Timeline items={m.log.map((l, i) => ({ key: i, date: l.date, text: l.text })).reverse()} />
      </div>
    </Screen>
  );
}
