"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { Empty, Icon } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const ICON = { civic: "civic", shield: "shield", groups: "groups", chat: "chat" } as const;

export default function Notifications() {
  const { state, update } = useStore();
  const router = useRouter();
  return (
    <Screen title={translate(state.prefs.lang, "notifications")}>
      {state.notifications.length ? (
        <div className="list">
          {state.notifications.map((n) => (
            <button
              key={n.id}
              className="li"
              onClick={() => {
                update((d) => void (d.notifications.find((x) => x.id === n.id)!.unread = false));
                router.push(n.href);
              }}
            >
              <span style={{ color: "var(--primary)" }}>
                <Icon name={ICON[n.icon]} />
              </span>
              <span className="sp">{n.text}</span>
              {n.unread && <span className="chip s">New</span>}
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="bell" title="No notifications" />
      )}
    </Screen>
  );
}
