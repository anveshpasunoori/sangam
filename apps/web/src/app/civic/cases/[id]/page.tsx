"use client";

import { useParams } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { CivicChip } from "@/components/civic";
import { useUI } from "@/components/UIProvider";
import { Empty, Icon, Progress, Timeline } from "@/components/ui";
import { allowedActions, FLOW, isTerminal, progressIndex, transition, type CivicAction } from "@/domain/civic";
import { useStore } from "@/lib/store";

const LABEL = { u: "Your statement", s: "Platform step", o: "Official response (simulated)" };

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const { openSheet, toast } = useUI();
  const c = state.cases.find((x) => x.id === id);
  if (!c)
    return (
      <Screen title="Complaint">
        <Empty title="This complaint does not exist" />
      </Screen>
    );

  const allowed = allowedActions(c);
  const act = (a: CivicAction, msg?: string) => {
    update((d) => {
      const i = d.cases.findIndex((x) => x.id === id);
      d.cases[i] = transition(d.cases[i], a);
    });
    if (msg) toast(msg);
  };
  const idx = progressIndex(c);
  const fullDone = ["RESOLVED", "UNRESOLVED", "CLOSED"].includes(c.state);

  return (
    <Screen title={c.ref}>
      <div className="pad stack">
        <div className="row g8 wrap">
          <CivicChip state={c.state} />
          {c.escalated && <span className="chip s">ESCALATED</span>}
          <span className="chip">{c.category}</span>
        </div>
        <h2>{c.title}</h2>
        <p>{c.description}</p>
        <span className="meta row g8">
          <Icon name="pin" size={16} />
          {c.location}
        </span>
        <span className="meta row g8">
          <Icon name="lock" size={16} />
          {c.visibility}
        </span>
        <span className="meta row g8">
          <Icon name="civic" size={16} />
          {c.authority}
        </span>

        <div>
          <Progress steps={FLOW.length} index={idx} allDone={fullDone} label={`Progress: step ${Math.max(idx, 0) + 1} of ${FLOW.length}`} />
          <div className="row meta" style={{ justifyContent: "space-between", marginTop: 4 }}>
            <span>Submitted</span>
            <span>Resolution review</span>
          </div>
        </div>

        {allowed.includes("confirm") && (
          <div className="card stack" style={{ borderColor: "var(--saffron-fill)" }}>
            <h3>Was the issue fixed?</h3>
            <p className="meta">Only you can confirm a resolution. An office marking it complete is not enough.</p>
            <div className="row g8">
              <button className="btn sp" onClick={() => act({ type: "confirm", fixed: true }, "Thank you. Resolution verified by you.")}>
                Yes, it is fixed
              </button>
              <button className="btn sec sp" onClick={() => act({ type: "confirm", fixed: false }, "Recorded. You can escalate or reopen.")}>
                No, not fixed
              </button>
            </div>
          </div>
        )}

        <div className="row g8 wrap">
          {allowed.includes("advance") && (
            <button className="btn sm" onClick={() => act({ type: "advance" })}>
              {c.state === "RESOLVED" ? "Simulate closing" : "Simulate next step"}
            </button>
          )}
          {allowed.includes("escalate") && (
            <button className="btn sm sec" onClick={() => act({ type: "escalate" }, "Escalation recorded.")}>
              Escalate
            </button>
          )}
          {allowed.includes("reopen") && (
            <button className="btn sm sec" onClick={() => act({ type: "reopen" })}>
              Reopen
            </button>
          )}
          {allowed.includes("withdraw") && (
            <button
              className="btn sm danger"
              onClick={() =>
                openSheet("Withdraw this complaint?", (close) => (
                  <>
                    <p>The case will be marked WITHDRAWN and kept in your history. You can file again later.</p>
                    <button className="btn danger" onClick={() => (act({ type: "withdraw" }), close())}>
                      Withdraw complaint
                    </button>
                    <button className="btn sec" onClick={close}>
                      Keep it open
                    </button>
                  </>
                ))
              }
            >
              Withdraw
            </button>
          )}
        </div>
        {!isTerminal(c.state) && (
          <p className="meta">“Simulate next step” stands in for triage staff and offices so you can walk the whole journey. No real office is involved.</p>
        )}

        <h3>Evidence ({c.evidence.length})</h3>
        {c.evidence.length ? (
          <>
            <div className="list" style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)" }}>
              {c.evidence.map((e, i) => (
                <div key={i} className="li">
                  <Icon name="file" />
                  <span className="col sp">
                    <b style={{ overflowWrap: "anywhere" }}>{e.name}</b>
                    <span className="meta num">
                      {e.size} · SHA-256 {e.hash}
                    </span>
                  </span>
                  <span className="chip">Restricted</span>
                </div>
              ))}
            </div>
            <p className="meta">Originals are restricted. The public view would show a redacted copy. Evidence is your allegation until reviewed.</p>
          </>
        ) : (
          <p className="meta">No evidence attached.</p>
        )}

        <h3>Case timeline</h3>
        <Timeline
          items={c.log
            .map((l, i) => ({
              key: i,
              title: l.state.replace(/_/g, " "),
              date: l.date,
              meta: `${l.actor} · ${LABEL[l.kind]}`,
              text: l.text,
              dot: (l.kind === "s" ? "" : l.kind) as "" | "o" | "u",
            }))
            .reverse()}
        />
      </div>
    </Screen>
  );
}
