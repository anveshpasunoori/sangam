"use client";

import { useParams, useRouter } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { useSafetyActions } from "@/components/sheets";
import { useUI } from "@/components/UIProvider";
import { Avatar, Empty, Icon, Notice } from "@/components/ui";
import { isVisible } from "@/domain/feed";
import { remove, toggle, useStore } from "@/lib/store";

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const { state, update, nextSeq } = useStore();
  const { toast, openSheet } = useUI();
  const safety = useSafetyActions();
  const router = useRouter();
  const u = state.users[id];
  if (!u || id === "me") {
    return (
      <Screen title="Profile">
        <Empty title="This account does not exist" />
      </Screen>
    );
  }
  const blocked = state.blocked.includes(u.id);
  const friend = state.friends.includes(u.id);
  const requested = state.friendRequests.includes(u.id);
  const following = state.following.includes(u.id);
  const posts = state.posts.filter((p) => p.by === u.id && isVisible({ ...state, muted: [] }, p));

  return (
    <Screen title={u.name}>
      <div className="pad stack" style={{ background: "var(--surface)" }}>
        <div className="row g16">
          <Avatar user={u} size={72} />
          <div className="col">
            <h2>{u.name}</h2>
            <span className="meta">
              @{u.handle}
              {u.verified ? " · Verified" : ""}
            </span>
          </div>
        </div>
        <p>{u.bio}</p>
        {blocked ? (
          <>
            <Notice tone="w" icon="lock">
              You have blocked this account. They cannot see your posts or message you.
            </Notice>
            <button
              className="btn sec"
              onClick={() => {
                update((d) => remove(d.blocked, u.id));
                toast("Unblocked.");
              }}
            >
              Unblock
            </button>
          </>
        ) : (
          <div className="row g8 wrap">
            <button
              className={`btn sm ${friend || requested ? "sec" : ""}`}
              onClick={() => {
                update((d) => {
                  if (friend) remove(d.friends, u.id);
                  else toggle(d.friendRequests, u.id);
                });
                toast(friend ? "Removed from friends." : requested ? "Friend request cancelled." : "Friend request sent. They need to accept it.");
              }}
            >
              {friend ? "Friends" : requested ? "Request sent" : "Add friend"}
            </button>
            <button className={`btn sm ${following ? "sec" : ""}`} onClick={() => update((d) => void toggle(d.following, u.id))}>
              {following ? "Following" : "Follow"}
            </button>
            <button
              className="btn sm sec"
              onClick={() => {
                let chat = state.chats.find((c) => c.with === u.id);
                if (!chat) {
                  chat = { id: `m${nextSeq()}`, with: u.id, unread: 0, messages: [] };
                  const created = chat;
                  update((d) => void d.chats.unshift(created));
                }
                router.push(`/messages/${chat.id}`);
              }}
            >
              Message
            </button>
            <button
              className="icon"
              aria-label="More options"
              onClick={() =>
                openSheet("Options", (close) => (
                  <>
                    <button className="btn sec" onClick={() => (close(), safety.mute(u.id))}>
                      Mute
                    </button>
                    <button className="btn danger" onClick={() => (close(), safety.block(u.id))}>
                      Block
                    </button>
                    <button className="btn danger" onClick={() => (close(), safety.report("Impersonation"))}>
                      Report impersonation
                    </button>
                  </>
                ))
              }
            >
              <Icon name="more" />
            </button>
          </div>
        )}
      </div>
      {!blocked &&
        (posts.length ? (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <Empty title="No posts you can see">
            <span>Some posts may be shared with friends only.</span>
          </Empty>
        ))}
    </Screen>
  );
}
