"use client";

import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Avatar, Empty } from "@/components/ui";
import { remove, useStore } from "@/lib/store";

export default function Blocked() {
  const { state, update } = useStore();
  const { toast } = useUI();
  const rows = [...state.blocked.map((id) => [id, "Blocked"] as const), ...state.muted.map((id) => [id, "Muted"] as const)];
  return (
    <Screen title="Blocked and muted">
      {rows.length ? (
        <>
          <div className="list">
            {rows.map(([id, kind]) => (
              <div key={`${kind}-${id}`} className="li">
                <Avatar user={state.users[id]} />
                <span className="col sp">
                  <b>{state.users[id].name}</b>
                  <span className="meta">{kind}</span>
                </span>
                <button
                  className="btn sm sec"
                  onClick={() => {
                    update((d) => remove(kind === "Blocked" ? d.blocked : d.muted, id));
                    toast(kind === "Blocked" ? "Unblocked." : "Unmuted.");
                  }}
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
          <p className="pad meta">Blocked people cannot see your posts or message you. Muted people are not told.</p>
        </>
      ) : (
        <Empty icon="lock" title="No one is blocked or muted">
          <span>Use the menu on any post to block or mute its author.</span>
        </Empty>
      )}
    </Screen>
  );
}
