"use client";

import Link from "next/link";
import { useUI } from "@/components/UIProvider";
import { Avatar } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Community } from "@/lib/types";

export function useJoin() {
  const { update } = useStore();
  const { toast } = useUI();
  return (c: Community) => {
    update((d) => {
      const x = d.communities.find((y) => y.id === c.id)!;
      if (x.membership === "member") {
        x.membership = "none";
        x.members--;
      } else if (x.membership === "requested") {
        x.membership = "none";
      } else if (x.privacy === "Private") {
        x.membership = "requested";
      } else {
        x.membership = "member";
        x.members++;
      }
    });
    toast(
      c.membership === "member"
        ? `You left ${c.name}.`
        : c.membership === "requested"
          ? "Request cancelled."
          : c.privacy === "Private"
            ? "Request sent to the admins."
            : `Joined ${c.name}.`,
    );
  };
}

export const joinLabel = (c: Community, inside = false) =>
  c.membership === "member"
    ? inside
      ? "Leave community"
      : "Joined"
    : c.membership === "requested"
      ? inside
        ? "Cancel request"
        : "Requested"
      : c.privacy === "Private"
        ? "Request to join"
        : "Join";

export function CommunityCard({ c }: { c: Community }) {
  const join = useJoin();
  return (
    <div className="card stack" style={{ gap: 8 }}>
      <Link href={`/communities/${c.id}`} className="row g12">
        <Avatar user={{ name: c.name, hue: c.hue }} size={44} />
        <span className="col">
          <b>{c.name}</b>
          <span className="meta">
            {c.members.toLocaleString("en-IN")} members · {c.privacy}
          </span>
        </span>
      </Link>
      <p className="meta">{c.description}</p>
      <button className={`btn sm ${c.membership !== "none" ? "sec" : ""}`} style={{ alignSelf: "flex-start" }} onClick={() => join(c)}>
        {joinLabel(c)}
      </button>
    </div>
  );
}

