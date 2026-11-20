# Sangam

**Connect. Create. Belong. Be Heard.** A trust-first social and civic network for India.

This is the web client built from the *Sangam Product Blueprint* and the *Sangam Prototype*. It turns the single-file prototype into a Next.js + TypeScript app with real routes, a responsive layout and tested domain rules. The web app runs in the browser on fictional data. Stage E contracts are in `contracts/`; there is no backend service yet.

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/web` | The Next.js web client (stage C, refined) |
| `contracts` | Stage E: PostgreSQL migrations, OpenAPI, event schemas, state machines. See [contracts/README.md](contracts/README.md) |

## Run it

```bash
npm install
npm run dev               # web app on http://localhost:3000 (set PORT to change)
npm test                  # web unit tests and contract tests (contract tests need the database below)
npm run typecheck
npm run build
npm run contracts:check   # lint OpenAPI, start Postgres in Docker, migrate, run contract tests
```

## What is in it

| Area | Routes |
| --- | --- |
| Home feed (For You, Friends, Following), stories | `/` |
| Reels | `/reels` |
| Create with pre-publish check, drafts, polls | `/create` |
| Communities, events, RSVP, private join requests | `/communities`, `/communities/[id]` |
| Profile, edit, saved, drafts | `/profile`, `/profile/edit` |
| Other people, single post (audience-checked) | `/u/[id]`, `/p/[id]` |
| Messages and message requests | `/messages`, `/messages/[id]` |
| Notifications, search | `/notifications`, `/search` |
| Settings (theme, text size, language, data saver, privacy, reset) | `/settings`, `/settings/blocked` |
| Sangam Civic: home, 6-step report wizard, cases, issues, dashboard, help | `/civic/...` |
| Safety Center, moderation decisions and appeals | `/safety`, `/safety/decisions/[id]` |
| Platform Ombudsman | `/ombudsman`, `/ombudsman/new`, `/ombudsman/[id]` |

Desktop shows a left nav and an info rail; phones get the bottom tab bar from the prototype. Light and dark themes use the blueprint's colour tokens.

## Web app code layout (`apps/web`)

```
src/
  domain/      pure rules, unit-tested
    civic.ts       case state machine (no transition outside it; every step logged with actor)
    feed.ts        canView = the single audience check (mirrors content.can_view in SQL) for every read path; feed ranking
    screening.ts   pre-publish check (keyword stand-in for the multilingual model)
    ombudsman.ts   ombudsman case flow
  lib/
    types.ts   domain types
    seed.ts    fictional demo data (Navapur)
    store.tsx  app state, persisted to localStorage
    i18n.ts    nav labels in English, Hindi, Telugu
  components/  shell, post card, sheets, UI primitives
  app/         one folder per route
```

## Honest limits

- No accounts, server or network calls; state lives in `localStorage` (Settings → Reset all data).
- Moderation is a keyword rule. Civic and ombudsman steps after submission are labelled simulations, and no authority is ever contacted.
- Translations cover navigation labels only; post translations are fixed demo strings.
- Reels and stories use illustrations, not video.
