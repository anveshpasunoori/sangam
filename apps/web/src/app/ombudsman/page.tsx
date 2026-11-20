"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Ombudsman() {
  const { state } = useStore();
  return (
    <Screen title="Platform Ombudsman">
      <div className="hero">
        <h2>An independent second look.</h2>
        <p>For complaints about how Sangam itself treated you.</p>
        <Link className="btn" href="/ombudsman/new">
          File a complaint
        </Link>
      </div>
      <div className="pad stack">
        <Notice tone="w" icon="scale">
          The Ombudsman is an internal, independent review function of the platform. <b>It is not a government or statutory office</b>, and it is separate
          from Sangam Civic.
        </Notice>
      </div>
      <div className="sec-h">Your cases</div>
      <div className="pad stack" style={{ paddingTop: 0 }}>
        {state.ombudsman.length ? (
          state.ombudsman.map((o) => (
            <Link key={o.id} className="card" href={`/ombudsman/${o.id}`}>
              <span className="row g8 wrap">
                <span className="chip p">{o.state.replace(/_/g, " ")}</span>
                <span className="meta num">{o.ref}</span>
              </span>
              <h3 style={{ marginTop: 6 }}>{o.type}</h3>
              <span className="meta">{o.description.slice(0, 80)}</span>
            </Link>
          ))
        ) : (
          <p className="meta">You have no Ombudsman cases.</p>
        )}
      </div>
    </Screen>
  );
}
