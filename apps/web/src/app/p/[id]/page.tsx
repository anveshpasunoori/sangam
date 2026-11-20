"use client";

import { useParams } from "next/navigation";
import { Screen } from "@/components/AppShell";
import { PostCard } from "@/components/PostCard";
import { Comments } from "@/components/sheets";
import { Empty } from "@/components/ui";
import { canView } from "@/domain/feed";
import { useStore } from "@/lib/store";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useStore();
  const p = state.posts.find((x) => x.id === id);
  // Deep links go through the same audience check as feeds.
  return (
    <Screen title="Post">
      {p && canView(state, p) ? (
        <>
          <PostCard post={p} />
          <div className="pad stack">
            <h3>Comments</h3>
            <Comments postId={p.id} />
          </div>
        </>
      ) : (
        <Empty icon="lock" title="This post is not available">
          <span>It may have been deleted, or shared with an audience you are not part of.</span>
        </Empty>
      )}
    </Screen>
  );
}
