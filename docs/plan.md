# Diamond Legends — Phase 1 Work Plan

Based on GDD v1.3. Updated: 2026-03-26.

---

## Status legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Milestone 0 — Foundation (done)

- [x] Vite + React + Tailwind project scaffold
- [x] Framer Motion + Zustand installed
- [x] `src/data/teams.json` — 13 franchises, 4 eras, colors, relocations
- [x] `src/data/cards.json` — 8 seed cards with full field set
- [x] `src/components/Card.jsx` — era-styled fronts (Deadball/Golden/Hardball/Modern)
- [x] `src/components/CardExpanded.jsx` — 900×500 landscape overlay, portal-based, stats table, tool bars
- [x] `src/components/TeamLogo.jsx` — PNG-over-SVG auto-preference
- [x] `pipeline/generate_logos.js` — SVG placeholder logos for all 13 franchises
- [x] `comfyui/logo_workflow.py` — per-franchise per-era AI logo generation via ComfyUI REST API

---

## Milestone 1 — Core Data Files

These must exist before engine or UI work can proceed.

- [x] **`src/data/pitchTypes.json`** — 7 pitch types with zone tendency grids, contact quality modifiers, and tool interactions (per GDD §5.3)
- [x] **`src/data/ballFlightMatrix.json`** — pitch type × contact zone → field zone probability table (per GDD §5.5)
- [x] **`src/data/aiTeams.json`** — AI opponent rosters for season scheduler (per GDD §8)
- [x] **`src/data/cards.json` (beta scope)** — 15 Deadball + 15 Modern cards (30 total). Golden + Hardball deferred to post-beta content patch. File retains 4 existing golden/hardball seed cards as placeholders.

---

## Milestone 2 — At-Bat Engine (GDD §5)

Core game loop. Build engine logic before any UI that depends on it.

### 2a — State machine (`src/engine/atBat.js`)

7-step sequence per at-bat:

1. **Pitcher selects pitch type + target zone** — AI draws from zone tendency grid (pitchTypes.json), zone decay applied for recently used zones
2. **Batter reads + guesses** — player picks guess zone from 3×3 grid; correct guess = +20% contact quality bonus
3. **Pitch execution roll** — pitcher tool score vs. pitch type difficulty → actual vs. intended zone delta
4. **Contact quality resolution** — batter tool (contact/power) vs. pitch type modifier + guess bonus → contact tier (weak/solid/hard/barrel)
5. **Ball flight lookup** — ballFlightMatrix.json: pitch type × contact zone → weighted random field zone
6. **Defensive resolution** — field zone probability gradient (GDD §5.6) → out / hit / error
7. **Outcome recording** — update count, advance runners, emit event for UI

- [x] `src/engine/atBat.js` — full state machine
- [x] `src/engine/pitchAI.js` — pitcher AI: zone tendency selection, zone decay tracker, pitch count strategy
- [x] `src/engine/contactResolver.js` — contact quality table lookup
- [x] `src/engine/ballFlight.js` — matrix lookup + weighted random field zone
- [x] `src/engine/defenseResolver.js` — probability gradient → outcome

### 2b — Token system (`src/engine/tokens.js`)

Dual pools: Batting tokens + Pitching tokens. Reset per game.

- [x] Token state model (pool size, spent, available)
- [x] Power-up tier definitions: Spark / Boost / Surge / Blitz
- [x] Token effects: pull shift, oppo push, gap finder, infield in, scouting report, extra die
- [ ] Reliever information reset — when new pitcher enters, pitch tendency knowledge resets for batter

### 2c — Inning phases

- [x] Phase detection: early (innings 1–3), middle (4–6), late (7–9) — `getInningPhase()` in atBat.js
- [x] Phase affects AI aggressiveness and token usage strategy — wired into `selectAIPitch()`

---

## Milestone 3 — Game UI (GDD §6, §7)

### 3a — ZoneGrid component (`src/components/ZoneGrid.jsx`)

- [x] 3×3 interactive pitch zone grid
- [x] Overlays: tendency percentages (visible after 5 pitches)
- [x] Pitch history trail — last 3 pitches shown as colored dots in zones
- [x] Budget depletion states — zones gray out as pitcher budget is spent
- [x] Zone selection with confirm step (no accidental clicks)

### 3b — At-bat HUD (`src/components/AtBatHUD.jsx`)

- [x] Count display (balls/strikes/outs)
- [x] Pitch type indicator (revealed after pitch)
- [x] Token pool displays (batting + pitching)
- [x] Inning / score / bases occupied

### 3c — Token menu (`src/components/TokenMenu.jsx`)

- [x] 4-tier selection: Spark / Boost / Surge / Blitz
- [x] Shows cost and available balance
- [x] Disabled states when insufficient tokens

---

## Milestone 4 — Zustand Stores

- [x] **`src/stores/gameStore.js`** — active at-bat state, count, score, inning, phase
- [x] **`src/stores/rosterStore.js`** — player's 15-man roster, bench/lineup management
- [x] **`src/stores/seasonStore.js`** — 30-game schedule, standings, series results
- [x] **`src/stores/collectionStore.js`** — owned cards, pack history, pack draw logic

---

## Milestone 5 — Roster & Collection Screens

- [x] **Roster screen** — 15-man roster, lineup order, bench, swap UI
- [x] **Collection screen** — card grid, filters by era/rarity/position, sort options
- [x] **Pack opening** — animated reveal, rarity weighted draw
- [x] **App.jsx** — full multi-screen nav (collection / roster / season / atbat), Nav.jsx wired in

---

## Milestone 6 — Season / Series Scheduler (GDD §8)

- [x] 30-game season structure — 10 series vs. AI opponents (3 games each)
- [x] Series scheduling — home/away, opponent rotation
- [x] Standings table — W/L, run differential
- [x] AI roster preview from `aiTeams.json` — starter, top hitters, tendencies shown in next-game panel

---

## Milestone 7 — Portrait Pipeline

- [x] **`pipeline/portrait_workflow.py`** — per-player AI portrait generation
  - Era-appropriate styles: deadball=sepia 1910s photo, golden=1940s illustrated, hardball=1970s gritty, modern=sports photography
  - Flux1-dev + realism LoRA via ComfyUI REST API + WebSocket image return
  - Output: `public/portraits/[cardId].png` (auto-served by Vite dev server)
  - CLI: `--all`, `--era ERA`, `--card CARD_ID`, default=missing only
- [x] Wire portrait images into Card.jsx — `PortraitImg` component with graceful fallback to era placeholder

---

## Ongoing

- [ ] Logo generation — run all 13 teams, review AI output, promote approved PNGs
- [ ] `DECISIONS.md` at repo root — running log of design changes vs. GDD (per v1.3 kickoff prompt)
- [ ] GDD sync — push `docs/gdd-updates.md` entries to Google Doc as needed

---

## Phase 1 target

Playable single-game loop: pick lineup → play 9-inning game vs. AI → see result → return to collection.
