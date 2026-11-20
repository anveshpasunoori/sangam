"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/AppShell";
import { Notice } from "@/components/ui";
import { OMB_TYPES } from "@/domain/ombudsman";
import { useStore } from "@/lib/store";

export default function NewOmbudsman() {
  const { update, nextSeq } = useStore();
  const router = useRouter();
  const [type, setType] = useState(OMB_TYPES[0]);
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  return (
    <Screen title="New Ombudsman complaint">
      <form
        className="pad stack"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const v = desc.trim();
          if (v.length < 20) return setErr("Describe the complaint in at least 20 characters.");
          const n = nextSeq();
          const id = `o${n}`;
          update((d) =>
            void d.ombudsman.unshift({
              id,
              ref: `SGM-O-0${200 + n}`,
              type,
              description: v,
              state: "RECEIVED",
              log: [{ date: "Today", state: "RECEIVED", text: "Complaint received." }],
            }),
          );
          router.replace(`/ombudsman/${id}`);
        }}
      >
        <label className="f">
          What is it about?
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {OMB_TYPES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="f">
          What happened, and what outcome do you want?
          <textarea maxLength={800} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <p className="err-t" role="alert">
          {err}
        </p>
        <Notice>Try the normal appeal first where one exists. The Ombudsman reviews how the platform acted, and can recommend corrective action.</Notice>
        <button className="btn">Submit complaint</button>
      </form>
    </Screen>
  );
}
