# Foster Line · Family Impact Dashboard (Static Bundle)

A portable, PWA-ready dashboard for your family’s impact—crypto routed, kids fed, and conflicts de‑escalated—with progressive gamification and a built‑in confidence boost engine.

## Quick Deploy

1) Extract the ZIP.
2) Upload **all files** to a folder on your website (e.g. `/impact/`).
3) Visit that URL in your browser. It works as a standalone static site.
4) Keep the page open for 10–15s on first visit to allow the service worker to cache files for offline use.

> Works on any static host: cPanel, GitHub Pages, Netlify, Cloudflare Pages, etc.

## Data

- Primary data lives in `data/events.json` (schema version: 1).
- Optional **uplink**: `data/uplink.json`. If present, its events are merged (deduped by date+who+ref/tx).
- You can also **import CSV** at runtime via the “Import CSV” button (columns: `date,who,usd,kids,conflicts,chain,tx,ref`).

## Gamification (progressive)

- **XP**: 1 XP per USD, 5 XP per kid, 20 XP per de‑escalation (tweakable in `app.js`).
- **Levels**: progressive thresholds; each member has their own level and progress bar.
- **Achievements**: first gift, 10/100 kids, de‑escalations, 100/1000 USD, 7/30‑day streaks.
- **Peace Points**: soft currency (3 per kid, 15 per de‑escalation) for future “impact quests.”
- **Confidence Boost**: contextual encouragement based on week‑over‑week deltas.

## PWA / Offline

- `service-worker.js` caches local assets and does stale‑while‑revalidate for CDN libraries.
- `manifest.json` enables “Add to Home Screen.”

## Future‑proof Notes

- The frontend is entirely static: just HTML/JS/CSS with React+Recharts via CDN, so it’s host‑agnostic.
- Schema versioning is supported; new fields are ignored safely.
- Optional `uplink.json` lets you point at a sheet/API when you’re ready without changing code.

## Customize

- Edit UI copy in `app.js` (look for the header/ethos strings).
- Tune XP weighting and achievements in `XP_MODEL` and `ACHIEVEMENTS`.
- Add or rename members in the `MEMBERS` array.

## Security & Privacy

- No trackers. No server required.
- If you add an uplink, ensure it’s read‑only and omits private keys or PII.

— Built for Foster + Navi, with love.
