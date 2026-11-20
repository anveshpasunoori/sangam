"use client";

import type { ReactNode } from "react";
import type { ArtKind, User } from "@/lib/types";

/* ---------- icons ---------- */
const P = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  reels: "M4 4h16v16H4zM10 9l5 3-5 3z",
  plus: "M12 5v14M5 12h14",
  groups: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6M2 20c0-3 3-5 6-5s6 2 6 5M16 15c3 0 6 2 6 5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  bell: "M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
  chat: "M4 5h16v11H9l-5 4z",
  civic: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  share: "M4 12l16-8-6 16-3-7z",
  bookmark: "M6 4h12v17l-6-4-6 4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  scale: "M12 4v16M6 20h12M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z",
  check: "M5 12l5 5 9-10",
  pin: "M12 21s-6-6-6-11a6 6 0 1 1 12 0c0 5-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 1 1 8 0v3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  send: "M4 20l17-8L4 4l3 8zM7 12h8",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5",
  flag: "M5 21V4h12l-2 4 2 4H5",
  cc: "M3 6h18v12H3zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3",
  play: "M8 5l11 7-11 7z",
  right: "M9 5l7 7-7 7",
  wifi: "M3 9a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M12 18h.01M4 4l16 16",
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  );
}

/* ---------- brand: three connected people forming a sangam ---------- */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#4938B7" />
      <path d="M12 16C18 16 18 25 24 25S30 16 36 16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 32C18 32 18 23 24 23S30 32 36 32" stroke="#8FF1D5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4.5" fill="#FFD27A" stroke="#4938B7" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------- avatar ---------- */
const HUES = ["#5848C8", "#167F80", "#B87943", "#9163B6", "#BE6079", "#447BA8", "#60866A", "#A15E8E"];

export function Avatar({ user, size = 40 }: { user: Pick<User, "name" | "hue">; size?: number }) {
  const initials = user.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      className="av"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.4, background: HUES[user.hue % 8] }}
    >
      {initials}
    </span>
  );
}

/* ---------- original illustrations drawn from the palette ---------- */
const PALETTES = [
  ["#4938B7", "#A89FF5", "#FFCA78", "#EAE7FF"],
  ["#166D70", "#7DDCCB", "#F6C57C", "#E1F5F0"],
  ["#63419A", "#C5A7F0", "#F5C77E", "#F1EAFB"],
  ["#28375D", "#6589C5", "#F5C77E", "#9ED9D2"],
];

export function Art({ kind, hue = 0, animated = false }: { kind: ArtKind; hue?: number; animated?: boolean }) {
  const c = PALETTES[hue % 4];
  const s = animated ? "shape" : undefined;
  const common = { viewBox: "0 0 400 300", preserveAspectRatio: "xMidYMid slice", role: "img" } as const;
  if (kind === "hills")
    return (
      <svg {...common} aria-label="Illustration: hills at sunrise">
        <rect width="400" height="300" fill={c[3]} />
        <circle className={s} cx="290" cy="95" r="44" fill={c[2]} />
        <path className={s} d="M0 210 Q100 120 200 190 T400 160 V300 H0z" fill={c[1]} />
        <path d="M0 250 Q120 180 240 235 T400 215 V300 H0z" fill={c[0]} />
      </svg>
    );
  if (kind === "kolam") {
    const parts: ReactNode[] = [];
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++) {
        const x = 80 + i * 60,
          y = 30 + j * 60;
        parts.push(<circle key={`c${i}${j}`} cx={x} cy={y} r="5" fill={c[2]} />);
        if (i < 4 && j < 4)
          parts.push(
            <path
              key={`p${i}${j}`}
              d={`M${x} ${y + 30} Q${x + 30} ${y} ${x + 60} ${y + 30} Q${x + 30} ${y + 60} ${x} ${y + 30}z`}
              fill="none"
              stroke={(i + j) % 2 ? c[1] : "#fff"}
              strokeWidth="3"
            />,
          );
      }
    return (
      <svg {...common} aria-label="Illustration: kolam pattern of looping lines around dots">
        <rect width="400" height="300" fill={c[0]} />
        <g className={s}>{parts}</g>
      </svg>
    );
  }
  if (kind === "city") {
    const xs = [30, 80, 125, 180, 230, 285, 335];
    return (
      <svg {...common} aria-label="Illustration: city skyline at dusk">
        <rect width="400" height="300" fill={c[3]} />
        <circle className={s} cx="90" cy="70" r="30" fill={c[2]} />
        {xs.map((x, i) => {
          const hh = 70 + ((i * 53 + hue * 31) % 110);
          return (
            <g key={x}>
              <rect x={x} y={260 - hh} width="38" height={hh} fill={i % 2 ? c[0] : c[1]} />
              <rect x={x + 8} y={272 - hh} width="8" height="10" fill={c[2]} />
              <rect x={x + 22} y={292 - hh} width="8" height="10" fill={c[3]} />
            </g>
          );
        })}
        <rect y="260" width="400" height="40" fill={c[0]} />
      </svg>
    );
  }
  if (kind === "lamp")
    return (
      <svg {...common} aria-label="Illustration: unlit streetlights along a road at night">
        <rect width="400" height="300" fill="#12142B" />
        <path d="M0 300 L150 170 H250 L400 300z" fill="#1D2142" />
        <path d="M200 180v120" stroke="#AEB1CC" strokeWidth="3" strokeDasharray="14 12" />
        {[60, 330].map((x) => {
          const hx = x < 200 ? x + 40 : x - 40;
          return (
            <g key={x}>
              <path d={`M${x} 280V90H${hx}`} fill="none" stroke="#AEB1CC" strokeWidth="5" />
              <circle cx={hx} cy="96" r="9" fill="#2A2E52" stroke="#AEB1CC" strokeWidth="2" />
            </g>
          );
        })}
        <circle className={s} cx="320" cy="50" r="16" fill="#EEEEF8" />
      </svg>
    );
  return (
    <svg {...common} aria-label="Illustration: lake with ripples">
      <rect width="400" height="300" fill={c[3]} />
      <rect y="150" width="400" height="150" fill={c[1]} />
      <circle className={s} cx="200" cy="150" r="52" fill={c[2]} />
      <rect y="150" width="400" height="150" fill={c[1]} opacity=".75" />
      {[185, 215, 245, 275].map((y, i) => (
        <path key={y} d={`M${40 + i * 20} ${y}h${320 - i * 40}`} stroke={c[0]} strokeWidth="4" strokeLinecap="round" opacity=".6" />
      ))}
    </svg>
  );
}

/* ---------- small building blocks ---------- */
export function Notice({
  children,
  tone = "",
  icon = "info",
}: {
  children: ReactNode;
  tone?: "" | "w" | "t" | "e";
  icon?: IconName;
}) {
  return (
    <div className={`notice ${tone}`}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  );
}

export function Toggle({
  label,
  sub,
  on,
  onChange,
  id,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: () => void;
  id: string;
}) {
  return (
    <div className="sw">
      <span className="col sp">
        <b id={`l-${id}`}>{label}</b>
        {sub && <span className="meta">{sub}</span>}
      </span>
      <button type="button" className="tg" role="switch" aria-checked={on} aria-labelledby={`l-${id}`} onClick={onChange} />
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} role="tab" aria-selected={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  id,
}: {
  options: [T, ReactNode][];
  value: T;
  onChange: (v: T) => void;
  label: string;
  id: string;
}) {
  return (
    <div className="row g4 wrap" role="group" aria-labelledby={id} style={{ justifyContent: "flex-end" }}>
      <span id={id} className="vh">
        {label}
      </span>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className="chip" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <Icon name={icon} size={36} />}
      <b>{title}</b>
      {children}
    </div>
  );
}

export function StateChip({ state, tone }: { state: string; tone: string }) {
  return <span className={`chip ${tone}`}>{state.replace(/_/g, " ")}</span>;
}

export function Timeline({
  items,
}: {
  items: { key: string | number; title?: string; date: string; meta?: string; text: string; dot?: "" | "o" | "u" }[];
}) {
  return (
    <ol className="tl">
      {items.map((l) => (
        <li key={l.key}>
          <span className={`dot ${l.dot ?? ""}`}>
            <Icon name="check" size={12} stroke={3} />
          </span>
          <div className="col">
            <span className="row g8 wrap">
              {l.title && <b>{l.title}</b>}
              <span className="meta">{l.date}</span>
            </span>
            {l.meta && <span className="meta">{l.meta}</span>}
            <span>{l.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Progress({ steps, index, allDone = false, label }: { steps: number; index: number; allDone?: boolean; label: string }) {
  return (
    <div className="flow" role="img" aria-label={label}>
      {Array.from({ length: steps }, (_, j) => (
        <i key={j} className={allDone || (index >= 0 && j < index) ? "on" : j === index ? "now" : ""} />
      ))}
    </div>
  );
}
