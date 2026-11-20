"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Avatar, Empty, Notice, Seg } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { useStore } from "@/lib/store";

type Tab = "chats" | "requests";

function Inbox() {
  const { state, update, nextSeq } = useStore();
  const { toast } = useUI();
  const router = useRouter();
  const tab = (useSearchParams().get("tab") as Tab) || "chats";
  const chats = state.chats.filter((c) => !state.blocked.includes(c.with));

  return (
    <Screen title={translate(state.prefs.lang, "messages")}>
      <Seg<Tab>
        label="Messages"
        options={[
          ["chats", "Chats"],
          ["requests", `Requests (${state.requests.length})`],
        ]}
        value={tab}
        onChange={(v) => router.replace(v === "chats" ? "/messages" : "/messages?tab=requests", { scroll: false })}
      />
      {tab === "chats" ? (
        chats.length ? (
          <div className="list">
            {chats.map((c) => {
              const last = c.messages.at(-1);
              const u = state.users[c.with];
              return (
                <Link key={c.id} className="li" href={`/messages/${c.id}`}>
                  <Avatar user={u} size={44} />
                  <span className="col sp">
                    <b>{u.name}</b>
                    <span className="meta" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {last ? `${last.mine ? "You: " : ""}${last.text}` : "No messages yet"}
                    </span>
                  </span>
                  {c.unread > 0 && <span className="chip p num">{c.unread} new</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty icon="chat" title="No conversations yet" />
        )
      ) : state.requests.length ? (
        <div className="pad stack">
          <Notice>Requests come from people you have not connected with. They cannot see whether you have read them.</Notice>
          {state.requests.map((r) => {
            const u = state.users[r.from];
            return (
              <div key={r.id} className="card stack" style={{ gap: 8 }}>
                <div className="row g8">
                  <Avatar user={u} />
                  <b>{u.name}</b>
                </div>
                <p>{r.text}</p>
                <div className="row g8">
                  <button
                    className="btn sm"
                    onClick={() => {
                      const id = `m${nextSeq()}`;
                      update((d) => {
                        d.requests = d.requests.filter((x) => x.id !== r.id);
                        d.chats.unshift({ id, with: r.from, unread: 0, messages: [{ text: r.text }] });
                      });
                      router.push(`/messages/${id}`);
                    }}
                  >
                    Accept
                  </button>
                  <button
                    className="btn sm sec"
                    onClick={() => {
                      update((d) => void (d.requests = d.requests.filter((x) => x.id !== r.id)));
                      toast("Request deleted.");
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={() => {
                      update((d) => {
                        d.requests = d.requests.filter((x) => x.id !== r.id);
                        if (!d.blocked.includes(r.from)) d.blocked.push(r.from);
                      });
                      toast(`${u.name} blocked.`);
                    }}
                  >
                    Block
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon="chat" title="No message requests" />
      )}
    </Screen>
  );
}

export default function Messages() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}
