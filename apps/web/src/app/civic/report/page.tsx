"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Screen } from "@/components/AppShell";
import { useUI } from "@/components/UIProvider";
import { Icon, Notice, Toggle } from "@/components/ui";
import { CATEGORIES, fingerprint, formatSize, REPORT_STEPS, validateStep } from "@/domain/civic";
import { screen } from "@/domain/screening";
import { useStore } from "@/lib/store";
import type { CivicDraft, CivicVisibility, Evidence } from "@/lib/types";

const VISIBILITY: [CivicVisibility, string][] = [
  ["Public summary, identity hidden", "Others can support the issue. Your name and original files stay private."],
  ["Public summary with my name", "Your display name appears on the public issue."],
  ["Private", "Visible only to you and the office it is routed to."],
];

const NEW_DRAFT: CivicDraft = {
  step: 0,
  category: "",
  title: "",
  description: "",
  location: "",
  visibility: "Public summary, identity hidden",
  evidence: [],
  confirmed: false,
};

export default function Report() {
  const { state, update, nextSeq } = useStore();
  const { openSheet, toast } = useUI();
  const router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!state.civicDraft) update((s) => void (s.civicDraft = structuredClone(NEW_DRAFT)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const d = state.civicDraft;
  if (!d) return null;
  const step = d.step;
  const set = (fn: (x: CivicDraft) => void) => update((s) => s.civicDraft && fn(s.civicDraft));

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const added: Evidence[] = [];
    for (const f of Array.from(files)) {
      let hash = "unavailable";
      try {
        hash = await fingerprint(await f.arrayBuffer());
      } catch {
        /* Web Crypto unavailable (non-secure context) */
      }
      added.push({ name: f.name, size: formatSize(f.size), hash });
    }
    set((x) => void x.evidence.push(...added));
  }

  function next(e: FormEvent) {
    e.preventDefault();
    const check = validateStep(step, d!, screen);
    if (!check.ok) return setErr(check.error!);
    setErr("");
    if (step < REPORT_STEPS.length - 1) {
      set((x) => void x.step++);
      window.scrollTo({ top: 0 });
      return;
    }
    const n = nextSeq();
    const id = `k${n}`;
    const ref = `SGM-C-${1000 + n}`;
    const files = d!.evidence.length;
    update((s) => {
      s.cases.unshift({
        id,
        ref,
        category: d!.category,
        title: d!.title.trim(),
        description: d!.description.trim(),
        location: d!.location.trim(),
        visibility: d!.visibility,
        authority: "Not routed yet",
        state: "SUBMITTED",
        escalated: false,
        evidence: d!.evidence,
        log: [{ date: "Today", state: "SUBMITTED", actor: "You", kind: "u", text: `Complaint submitted with ${files} evidence file${files === 1 ? "" : "s"}.` }],
      });
      s.civicDraft = null;
    });
    router.replace(`/civic/cases/${id}`);
    openSheet("Complaint saved", (close) => (
      <>
        <p>
          Your reference is <b className="num">{ref}</b>. Its status is SUBMITTED.
        </p>
        <Notice tone="w">This case is stored only in your browser. Nothing has been sent to any office. Use “Simulate next step” on the case page to walk through the journey.</Notice>
        <button className="btn" onClick={close}>
          View case
        </button>
      </>
    ));
  }

  return (
    <Screen title="Report an issue">
      <div className="steps" aria-hidden="true">
        {REPORT_STEPS.map((x, i) => (
          <i key={x} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <form className="pad stack" noValidate onSubmit={next}>
        <span className="meta">
          Step {step + 1} of {REPORT_STEPS.length}: {REPORT_STEPS[step]}
        </span>

        {step === 0 && (
          <>
            <h2>What is the issue about?</h2>
            <div className="grid2" role="group" aria-label="Category">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className="cat" aria-pressed={d.category === c} onClick={() => set((x) => void (x.category = c))}>
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Describe what you saw</h2>
            <label className="f">
              Short title
              <input type="text" value={d.title} maxLength={80} placeholder="For example: Streetlights out on Ring Road" onChange={(e) => set((x) => void (x.title = e.target.value))} />
            </label>
            <label className="f">
              What happened, and since when?
              <textarea
                value={d.description}
                maxLength={800}
                placeholder="Stick to what you observed. Avoid naming private individuals."
                onChange={(e) => set((x) => void (x.description = e.target.value))}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Add evidence</h2>
            <p className="meta">
              Photos, video or documents. Files stay in your browser; nothing is uploaded. Each file gets a SHA-256 fingerprint so later changes can be detected.
            </p>
            <label className="btn sec" style={{ cursor: "pointer" }}>
              <Icon name="file" size={18} />
              Choose files
              <input type="file" className="vh" multiple accept="image/*,video/*,.pdf" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <button
              type="button"
              className="btn ghost"
              onClick={() => set((x) => void x.evidence.push({ name: `sample-photo-${x.evidence.length + 1}.jpg`, size: "Demo placeholder", hash: "not computed" }))}
            >
              Add a sample file instead
            </button>
            {d.evidence.length ? (
              <div className="list" style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)" }}>
                {d.evidence.map((e, i) => (
                  <div key={i} className="li">
                    <Icon name="file" />
                    <span className="col sp">
                      <b style={{ overflowWrap: "anywhere" }}>{e.name}</b>
                      <span className="meta num">
                        {e.size} · SHA-256 {e.hash}
                      </span>
                    </span>
                    <button type="button" className="icon" aria-label={`Remove ${e.name}`} onClick={() => set((x) => void x.evidence.splice(i, 1))}>
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Notice tone="w">Complaints with evidence are easier to route and verify. You can continue without it.</Notice>
            )}
            <Notice>Check that photos do not show faces, number plates or house numbers of people who are not involved.</Notice>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Where is it?</h2>
            <label className="f">
              Street, landmark and ward
              <input type="text" value={d.location} maxLength={120} placeholder="For example: Ring Road, Sector 4, Ward 12" onChange={(e) => set((x) => void (x.location = e.target.value))} />
            </label>
            <p className="meta">Sangam does not read your device location. Type the place yourself.</p>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Who can see this?</h2>
            <div className="stack" role="radiogroup" aria-label="Visibility">
              {VISIBILITY.map(([v, sub]) => (
                <button key={v} type="button" className="cat" role="radio" aria-checked={d.visibility === v} onClick={() => set((x) => void (x.visibility = v))}>
                  <span className="col">
                    <span>{v}</span>
                    <span className="meta" style={{ fontWeight: 400 }}>
                      {sub}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2>Review and submit</h2>
            <div className="card stack" style={{ gap: 6 }}>
              <span className="chip t" style={{ alignSelf: "flex-start" }}>
                {d.category}
              </span>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
              <span className="meta row g4">
                <Icon name="pin" size={14} /> {d.location}
              </span>
              <span className="meta row g4">
                <Icon name="file" size={14} /> {d.evidence.length} evidence file{d.evidence.length === 1 ? "" : "s"}
              </span>
              <span className="meta row g4">
                <Icon name="lock" size={14} /> {d.visibility}
              </span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              <Toggle
                id="rok"
                label="I confirm this is accurate to the best of my knowledge"
                sub="False or fabricated complaints can be rejected"
                on={d.confirmed}
                onChange={() => set((x) => void (x.confirmed = !x.confirmed))}
              />
            </div>
            <Notice tone="w">
              Submitting creates a case in this build only. <b>No authority is contacted</b> and no official acknowledgement will be generated.
            </Notice>
          </>
        )}

        <p className="err-t" role="alert">
          {err}
        </p>
        <div className="row g8">
          {step > 0 && (
            <button type="button" className="btn sec sp" onClick={() => (setErr(""), set((x) => void x.step--))}>
              Back
            </button>
          )}
          <button className="btn sp">{step === 5 ? "Submit complaint" : "Continue"}</button>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            router.push("/civic/cases");
            toast("Draft saved on this device.");
          }}
        >
          Save draft and exit
        </button>
      </form>
    </Screen>
  );
}
