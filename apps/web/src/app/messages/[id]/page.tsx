"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/AppShell";
import { Empty, Icon } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { state, update } = useStore();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const chat = state.chats.find((c) => c.id === id);

  useEffect(() => {
    if (chat?.unread) update((d) => void (d.chats.find((c) => c.id === id)!.unread = 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, chat?.unread]);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect
  // that returns a non-function makes React throw on unmount.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.messages.length]);

  if (!chat || state.blocked.includes(chat.with))
    return (
      <Screen title="Messages">
        <Empty icon="chat" title="This conversation is not available" />
      </Screen>
    );

  return (
    <Screen title={state.users[chat.with].name}>
      <div className="pad stack" style={{ minHeight: "calc(100dvh - 190px)", justifyContent: "flex-end" }}>
        <p className="meta" style={{ textAlign: "center" }}>
          Demo conversation. Messages you send stay in this browser and are not delivered to anyone.
        </p>
        {chat.messages.map((m, i) => (
          <div key={i} className={`bub ${m.mine ? "me" : ""}`}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="composer"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          update((d) => void d.chats.find((c) => c.id === id)!.messages.push({ mine: true, text: v }));
          setText("");
        }}
      >
        <label className="vh" htmlFor="msg-i">
          Message
        </label>
        <input type="text" id="msg-i" placeholder="Message" maxLength={500} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" aria-label="Send">
          <Icon name="send" size={18} />
        </button>
      </form>
    </Screen>
  );
}
