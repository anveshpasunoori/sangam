"use client";

import { useParams } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { Empty, Progress, Timeline } from "@/components/ui";
import { advanceOmb, OMB_FLOW } from "@/domain/ombudsman";
import { useStore } from "@/lib/store";

export default function OmbCasePage() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const o = state.ombudsman.find((x) => x.id === id);
  if (!o)
    return (
      <Screen title="Ombudsman case">
        <Empty title="This case does not exist" />
      </Screen>
    );
  const i = OMB_FLOW.indexOf(o.state);
  return (
    <Screen title={o.ref}>
      <div className="pad stack">
        <span className="chip p" style={{ alignSelf: "flex-start" }}>
          {o.state.replace(/_/g, " ")}
        </span>
        <h2>{o.type}</h2>
        <p>{o.description}</p>
        <Progress steps={OMB_FLOW.length} index={i} allDone={o.state === "CLOSED"} label={`Progress: step ${i + 1} of ${OMB_FLOW.length}`} />
        {o.state !== "CLOSED" && (
          <>
            <button
              className="btn sm"
              style={{ alignSelf: "flex-start" }}
              onClick={() =>
                update((d) => {
                  const k = d.ombudsman.findIndex((x) => x.id === id);
                  d.ombudsman[k] = advanceOmb(d.ombudsman[k]);
                })
              }
            >
              Simulate next step
            </button>
            <p className="meta">Stands in for the review team. No real reviewer is involved.</p>
          </>
        )}
        <h3>Case timeline</h3>
        <Timeline items={o.log.map((l, k) => ({ key: k, title: l.state.replace(/_/g, " "), date: l.date, text: l.text, dot: "u" as const })).reverse()} />
      </div>
    </Screen>
  );
}
