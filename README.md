# Circus Vargas Goes to Japan (2026)

Mobile-first trip companion for the Vargas family Japan trip **Oct 9–18, 2026**.

**Shared itinerary (edit):** https://docs.google.com/document/d/1t0yKSCdpAXDrOtdceFMqJ7ZXoe6zh-OmAR-z8jigMEA/edit

## Live URL (working now)

**Single-file companion (preferred — correct `text/html`):**  
**https://raw.githack.com/cvargasdc/circus-vargas-japan-2026/main/companion.html**

Also: `companion.html` on `main` (self-contained: CSS/JS/data inlined). Rebuild with `node scripts/build-companion.js` (also runs from `sync-data.js`).

**Multi-file / jsDelivr caveat:** `https://cdn.jsdelivr.net/gh/cvargasdc/circus-vargas-japan-2026@main/index.html` may serve `Content-Type: text/plain` with `nosniff`, so browsers will not render it. Prefer the companion URL above until GitHub Pages is enabled.

### GitHub Pages

- Repo: https://github.com/cvargasdc/circus-vargas-japan-2026  
- Intended Pages URL after enable: **https://cvargasdc.github.io/circus-vargas-japan-2026/**  
- **One-time:** GitHub → `circus-vargas-japan-2026` → Settings → Pages → Source **GitHub Actions** → re-run workflow “Deploy GitHub Pages”.  
  Fine-grained PAT / Actions token may not be able to *create* a Pages site (`Resource not accessible by integration`).

```bash
unset GITHUB_TOKEN; export GH_TOKEN=
gh api -X POST repos/cvargasdc/circus-vargas-japan-2026/pages \
  --input - <<< '{"build_type":"legacy","source":{"branch":"main","path":"/"}}'
```

## What this app does

| Tab | Behavior |
|-----|----------|
| **Today** | Tokyo-date day during Oct 9–18; else countdown to Oct 9 |
| **Itinerary** | Day picker with Maps/Search links, booked badges, doc mismatch callouts |
| **Phrases** | Searchable flip cards (6 categories); copy Japanese |
| **Stays** | Booked hotels + planned trains (SmartEX not ticketed yet) |
| **Party** | Notes, priorities, useful links |

### Local checklists (per phone)

- Done / visited checkboxes, ★ favorites, and personal notes → `localStorage` key `circus-vargas-japan-v1`, keyed by `dayId::itemId`.
- **Do not sync** across phones. Banner + Doc button remind: shared edits live in the Google Doc.

## Update data (Japan Prep)

Project path: `/workspace/circus-vargas-japan/`

1. Edit JSON in `data/` (`days.json`, `stays.json`, `trains.json`, `phrases.json`, `meta.json`, `links.json`, `party.json`).
2. `node scripts/sync-data.js` → regenerates `data.js` + `lastSynced` (PT). Use `KEEP_SYNC_TIME=1` to keep timestamp.
3. Commit & push:

```bash
unset GITHUB_TOKEN; export GH_TOKEN=
git add -A && git commit -m "Update trip data" && git push
```

4. Optional CDN purge: `https://purge.jsdelivr.net/gh/cvargasdc/circus-vargas-japan-2026@main/data.js`

## Local preview

```bash
cd /workspace/circus-vargas-japan && python3 -m http.server 8765
```

## Booked facts (authoritative)

- Oct 9: Villa Fontaine Premier Terminal 3 (Haneda)
- Oct 10–14: **Hotel Kyoto Shijo Kawaramachi** (not Forza) — check-in 2pm / out 11am
- Oct 14–18: **Koko Hotel Ginza 1-chome** — check-in 3pm / out 11am
- Shinkansen Green Car ×8: Nozomi 27 Oct 10 (Tokyo 11:12 / Shinagawa 11:19 → Kyoto 13:23); return Oct 14 ~11:13 → Tokyo ~13:24–13:33 — **Planned / not ticketed yet**
- Prefer jumbo van Haneda→Shinagawa Oct 10 morning

## Layout

```
index.html styles.css app.js data.js sw.js manifest.webmanifest
companion.html       # self-contained phone hosting
data/*.json          # source of truth
scripts/sync-data.js # regenerates data.js
.github/workflows/deploy-pages.yml
```

## Privacy

Public site. No passport numbers, payment cards, or secrets.
