"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { CommunityCard } from "@/components/community";
import { Icon } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function Communities() {
  const { state } = useStore();
  const mine = state.communities.filter((c) => c.membership === "member");
  const rest = state.communities.filter((c) => c.membership !== "member");
  return (
    <Screen
      title={translate(state.prefs.lang, "comm")}
      back={false}
      actions={
        <Link className="icon" href="/search" aria-label="Search">
          <Icon name="search" />
        </Link>
      }
    >
      <div className="community-hero"><span className="hero-eyebrow">FIND YOUR PEOPLE</span><h2>Better together.</h2><p>Discover shared passions, exchange ideas, and build something meaningful.</p><Link className="hero-primary" href="/search"><Icon name="search" size={18} /> Explore Sangam</Link></div>
      <div className="sec-h">Your communities</div>
      <div className="pad stack" style={{ paddingTop: 0 }}>
        {mine.length ? mine.map((c) => <CommunityCard key={c.id} c={c} />) : <p className="meta">You have not joined any community yet.</p>}
      </div>
      <div className="sec-h">Discover</div>
      <div className="pad stack" style={{ paddingTop: 0 }}>
        {rest.length ? rest.map((c) => <CommunityCard key={c.id} c={c} />) : <p className="meta">You have joined every community.</p>}
      </div>
    </Screen>
  );
}
