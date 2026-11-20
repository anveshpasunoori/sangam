"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { LANGS, translate, type TKey } from "@/lib/i18n";
import { Icon, Mark, Notice, type IconName } from "./ui";
import { useUI } from "./UIProvider";
import { StoryViewer } from "./StoryViewer";

const TABS: [string, IconName, TKey][] = [
  ["/", "home", "home"],
  ["/reels", "reels", "reels"],
  ["/create", "plus", "create"],
  ["/communities", "groups", "comm"],
  ["/profile", "user", "profile"],
];

function activeTab(path: string) {
  if (path === "/") return "/";
  const hit = TABS.find(([href]) => href !== "/" && path.startsWith(href));
  if (hit) return hit[0];
  if (path.startsWith("/settings") || path.startsWith("/safety") || path.startsWith("/ombudsman")) return "/profile";
  return "/";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, ready, update } = useStore();
  const { openSheet } = useUI();
  const path = usePathname();
  const t = (k: TKey) => translate(state.prefs.lang, k);
  const unreadMsgs = state.chats.reduce((a, c) => a + c.unread, 0) + state.requests.length;
  const unreadNotes = state.notifications.filter((n) => n.unread).length;
  const tab = activeTab(path);
  const { prefs } = state;

  // Apply appearance preferences to the document.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
    root.style.setProperty("--scale", String(prefs.scale));
    root.lang = prefs.lang;
    root.classList.toggle("reduced", prefs.reducedMotion);
  }, [prefs.theme, prefs.scale, prefs.lang, prefs.reducedMotion]);

  // First-run welcome.
  useEffect(() => {
    if (!ready || prefs.onboarded) return;
    openSheet("Welcome to Sangam", (close) => <Welcome close={close} />);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const side: [string, IconName, string, number?][] = [
    ["/", "home", t("home")],
    ["/search", "search", t("search")],
    ["/reels", "reels", t("reels")],
    ["/communities", "groups", t("comm")],
    ["/messages", "chat", t("messages"), unreadMsgs],
    ["/notifications", "bell", t("notifications"), unreadNotes],
    ["/civic", "civic", t("civic")],
    ["/profile", "user", t("profile")],
  ];

  return (
    <div id="app">
      <nav id="side" aria-label="Primary">
        <Link href="/" className="logo">
          <Mark size={30} />
          Sangam
        </Link>
        {side.map(([href, icon, label, badge]) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`side-link${href === "/civic" ? " civic" : ""}`} aria-current={on ? "page" : undefined}>
              <Icon name={icon} />
              <span className="sp">{label}</span>
              {badge ? <span className="chip p num">{badge}</span> : null}
            </Link>
          );
        })}
        <Link href="/create" className="btn block" style={{ marginTop: 12 }}>
          <Icon name="plus" size={18} stroke={2.4} />
          {t("create")}
        </Link>
        <Link href="/settings" className="side-link" aria-current={path.startsWith("/settings") ? "page" : undefined} style={{ marginTop: "auto" }}>
          <Icon name="gear" />
          <span className="sp">Settings</span>
        </Link>
      </nav>

      <div id="main">
        {prefs.offline && (
          <div className="offline" role="status">
            <Icon name="wifi" size={16} />
            Offline (simulated). New posts are saved as drafts.
          </div>
        )}
        {ready ? children : <div className="empty meta">Loading…</div>}
      </div>

      <aside id="rail" aria-label="About Sangam">
        <div className="card stack">
          <span className="chip s" style={{ alignSelf: "flex-start" }}>
            Early build · fictional data
          </span>
          <div className="tag">A space where every voice belongs.</div>
          <p className="meta">Connect with people, discover communities, and make your voice count. This preview uses fictional local data only.</p>
        </div>
        <Link href="/civic" className="card stack rail-civic">
          <span className="row g8" style={{ color: "var(--teal)" }}>
            <Icon name="civic" />
            <b>Sangam Civic</b>
          </span>
          <span className="meta">
            {state.cases.filter((c) => c.state === "RESOLUTION_REVIEW").length
              ? `${state.cases.filter((c) => c.state === "RESOLUTION_REVIEW").length} complaint needs your review`
              : "Report a local issue and track it"}
          </span>
        </Link>
        <div className="card stack" style={{ gap: 8 }}>
          <b>Language</b>
          <div className="row g4 wrap">
            {LANGS.map(([l, name]) => (
              <button key={l} className="chip" lang={l} aria-pressed={prefs.lang === l} onClick={() => update((d) => void (d.prefs.lang = l))}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <nav id="tabs" aria-label="Primary">
        {TABS.map(([href, icon, key]) => (
          <Link key={href} href={href} aria-current={tab === href ? "page" : undefined}>
            {key === "create" ? (
              <span className="mk">
                <Icon name={icon} size={20} stroke={2.4} />
              </span>
            ) : (
              <Icon name={icon} />
            )}
            <span>{t(key)}</span>
          </Link>
        ))}
      </nav>
      <StoryViewer />
    </div>
  );
}

function Welcome({ close }: { close: () => void }) {
  const { state, update } = useStore();
  return (
    <>
      <p style={{ fontFamily: "var(--display)", fontSize: "1.3rem", fontWeight: 600 }}>Connect. Create. Belong. Be Heard.</p>
      <p>This is an early build of Sangam. Every person, place, post and number is fictional, and what you do is kept only in this browser.</p>
      <div className="stack" style={{ gap: 6 }}>
        <b style={{ fontSize: ".85rem" }} id="w-l">
          Choose a language
        </b>
        <div className="row g8" role="group" aria-labelledby="w-l">
          {LANGS.map(([l, name]) => (
            <button key={l} className="chip" lang={l} aria-pressed={state.prefs.lang === l} onClick={() => update((d) => void (d.prefs.lang = l))}>
              {name}
            </button>
          ))}
        </div>
        <span className="meta">Navigation labels change. You can switch again in Settings.</span>
      </div>
      <Notice tone="t" icon="lock">
        Privacy starts on: posts default to Friends, and local discovery is off until you turn it on.
      </Notice>
      <button
        className="btn"
        onClick={() => {
          update((d) => void (d.prefs.onboarded = true));
          close();
        }}
      >
        Start exploring
      </button>
    </>
  );
}

/** Per-screen header. Root screens get no Back control; pushed screens do. */
export function Screen({
  title,
  back = true,
  actions,
  children,
  bare = false,
}: {
  title: ReactNode;
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  bare?: boolean;
}) {
  const router = useRouter();
  return (
    <>
      {!bare && (
        <header className="top">
          {back && (
            <button className="icon" aria-label="Back" onClick={() => (history.length > 1 ? router.back() : router.push("/"))}>
              <Icon name="back" />
            </button>
          )}
          <h1 style={back ? { marginLeft: -4 } : undefined}>{title}</h1>
          {actions}
        </header>
      )}
      <main className="view" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}

export function HomeHeader() {
  const { state } = useStore();
  const t = (k: TKey) => translate(state.prefs.lang, k);
  const unreadMsgs = state.chats.reduce((a, c) => a + c.unread, 0) + state.requests.length;
  const unreadNotes = state.notifications.filter((n) => n.unread).length;
  return (
    <header className="top home-top">
      <span className="logo">
        <Mark />
        Sangam
      </span>
      <Link className="icon" href="/search" aria-label={t("search")}>
        <Icon name="search" />
      </Link>
      <Link className="icon" href="/civic" aria-label={t("civic")} style={{ color: "var(--teal)" }}>
        <Icon name="civic" />
      </Link>
      <Link className="icon" href="/messages" aria-label={t("messages")}>
        <Icon name="chat" />
        {unreadMsgs ? <span className="badge">{unreadMsgs}</span> : null}
      </Link>
      <Link className="icon" href="/notifications" aria-label={t("notifications")}>
        <Icon name="bell" />
        {unreadNotes ? <span className="badge">{unreadNotes}</span> : null}
      </Link>
    </header>
  );
}
