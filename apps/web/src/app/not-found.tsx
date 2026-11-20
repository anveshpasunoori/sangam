"use client";

import Link from "next/link";
import { Screen } from "@/components/AppShell";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <Screen title="Not found">
      <Empty icon="search" title="This page does not exist">
        <Link className="btn sec" href="/">
          Go home
        </Link>
      </Empty>
    </Screen>
  );
}
