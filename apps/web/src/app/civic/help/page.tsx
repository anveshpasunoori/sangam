"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { CivicDisclaimer } from "@/components/civic";

export default function CivicHelp() {
  return (
    <Screen title="Help and escalation">
      <div className="pad stack">
        <CivicDisclaimer />
        <div className="card stack" style={{ gap: 6 }}>
          <h3>If there is no response</h3>
          <p className="meta">
            Open the case and choose Escalate. Sangam then guides you to the next verified official level for that office. Escalation here does not replace a
            statutory appeal.
          </p>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <h3>If you are at risk</h3>
          <p className="meta">
            Choose Private visibility when you file. Whistleblower and minor complainants are never shown publicly. For emergencies, contact local emergency
            services directly.
          </p>
        </div>
        <div className="card stack" style={{ gap: 6 }}>
          <h3>If Sangam mishandled your case</h3>
          <p className="meta">That is a complaint about the platform, not about a public office. Take it to the Platform Ombudsman.</p>
          <Link className="btn sec sm" href="/ombudsman" style={{ alignSelf: "flex-start" }}>
            Open Ombudsman
          </Link>
        </div>
      </div>
    </Screen>
  );
}
