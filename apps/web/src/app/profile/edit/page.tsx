"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { useStore } from "@/lib/store";

export default function EditProfile() {
  const { state, update } = useStore();
  const { toast } = useUI();
  const router = useRouter();
  const [name, setName] = useState(state.users.me.name);
  const [bio, setBio] = useState(state.users.me.bio);
  const [err, setErr] = useState("");
  return (
    <Screen title="Edit profile">
      <form
        className="pad stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (n.length < 2) return setErr("Enter a display name of at least 2 characters.");
          update((d) => {
            d.users.me.name = n;
            d.users.me.bio = bio.trim();
          });
          toast("Profile updated.");
          router.push("/profile");
        }}
      >
        <label className="f">
          Display name
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <p className="meta">Any name you are known by is fine. A legal name is not required.</p>
        <label className="f">
          Bio
          <textarea value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} />
        </label>
        <p className="err-t" role="alert">
          {err}
        </p>
        <button className="btn">Save</button>
      </form>
    </Screen>
  );
}
