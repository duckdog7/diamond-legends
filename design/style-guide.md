# Diamond Legends — Card Style Guide

Visual approval record for card art and layout across all four eras.
Update the samples log as card art is generated and reviewed.

Card samples: `design/card-samples/[era]/`
Naming: `[era]_[position]_[id].png`
Reference images: `design/references/` (gitignored)

---

## Era 1 — The Deadball Era (1900–1919)

**Reference card:** 1915 Cracker Jack Ball Players series
**Samples folder:** `design/card-samples/deadball/`

### Front layout (from reference)
- Large single color background (team primary — reference is bold red)
- Brand name prominently at top: "DIAMOND LEGENDS / BALL PLAYERS"
- Player art fills the middle — illustrated/painterly portrait style, NOT sepia photo
- White outer border with aged corner rivet details
- Player last name + year + team name at bottom in serif type
- No stats on the front — pure portrait + identity

### DL brand mark
- Subtle diamond outline with tiny "©DL" text, bottom-right corner
- Should feel like a period tobacco brand watermark

### Card number (back)
- Plain numeral, centered at top of back — no box, no decoration
- e.g. `12`, `7`, `34`

### Art style
- Illustrated/painted, NOT photographic
- Warm palette matching team color
- Player shown from waist up, hands on hips or arms at sides
- Serious expression, period uniform with high collar

### Prompt (locked)
```
Illustrated portrait painting, warm oil paint style, period baseball uniform
with high collar, serious expression, hands on hips, 1910s baseball player,
vintage poster illustration, bold flat color background, painterly brushwork
```

### Negative prompt (all eras)
```
text, watermark, logo, cartoon, anime, deformed hands, extra limbs,
blurry face, low quality, modern elements in historical eras, photograph
```

### Samples log
| File | Status | Notes |
|------|--------|-------|
| *(none yet)* | — | — |

---

## Era 2 — The Golden Age (1920–1959)

**Reference card:** 1958 Topps (Ted Williams)
**Samples folder:** `design/card-samples/golden/`

### Front layout (from reference)
- Team name banner across the top in team primary color — team name bold and prominent
- Photo portrait fills the majority of the card
- White outer border
- Player name bottom-left, small position circle badge bottom-left
- Card number in top-left or top-right depending on variation
- Subtle team color accent strip on right edge

### DL brand mark
- Top-right corner: white outline diamond, "DL" inside
- Same scale as Topps logo on reference

### Card number (back)
- Inside a colored pennant/star shape, top-left
- e.g. `#476`, `#21`

### Art style
- Hand-tinted color photograph feel — warm Kodachrome palette
- Studio portrait, plain or simple background
- Confident expression, slight smile acceptable
- Glossy surface quality

### Prompt (locked)
```
Hand-tinted color photograph, warm Kodachrome palette, baseball uniform with
team colors, confident expression, studio portrait, slightly glossy,
1940s baseball card portrait style, vivid but slightly faded color
```

### Samples log
| File | Status | Notes |
|------|--------|-------|
| *(none yet)* | — | — |

---

## Era 3 — The Hardball Era (1960–1989)

**Reference card:** 1986 Topps (Jim Beattie / Jose Canseco)
**Samples folder:** `design/card-samples/hardball/`

### Front layout (from reference)
- Black header bar across the top — team name in team primary color, bold
- Full action photo — player in motion, full-bleed
- White outer border
- Player name + position circle badge bottom-left
- DL mark top-right inside the black header

### DL brand mark
- Top-right in the black header bar: white outline diamond with "DL"

### Card number (back)
- In a color block banner, top-left of back
- Alphanumeric format acceptable: `20T`, `88`

### Back layout (from reference — 1986 Topps back)
- Colored background (team primary)
- Card number block + player name header with physical stats (HT, WT, BATS, THROWS, BORN)
- "COMPLETE BATTING/PITCHING RECORD" heading
- Full career stats table
- Highlights or flavor text at bottom

### Art style
- Full action photo, athletic pose
- Bright saturated colors, sharp focus
- Stadium lighting
- Slight film grain acceptable

### Prompt (locked)
```
Action portrait, athletic pose, bright stadium lighting, sharp color photography,
1970s baseball player, Topps card portrait style, bold colors, slight film grain,
dynamic crop
```

### Samples log
| File | Status | Notes |
|------|--------|-------|
| *(none yet)* | — | — |

---

## Era 4 — The Modern Game (1990–Today)

**Reference card:** 2025 Topps Series One (Oswaldo Cabrera)
**Samples folder:** `design/card-samples/modern/`

### Front layout (from reference)
- Full-bleed action photo — player taking up most of card
- Team name VERTICAL down the left side, team primary color bar
- Team logo bottom-left
- Player first name bottom-right
- Position diamond badge
- DL mark top-right
- Clean silver/white outer border with rounded corners

### DL brand mark
- Top-right: gold outline diamond with gold "DL" text
- Slightly more prominent than other eras — modern brand expression

### Card number (back)
- Top-right, plain numeral + "SERIES ONE" below
- e.g. `231 · SERIES ONE`, `047 · SERIES ONE`

### Back layout (from reference — 2025 Topps back)
- White/light background
- Team logo top-left, card number top-right
- Player name, team, position, physical stats header
- Career stats table — clean, data-forward
- One narrative paragraph at bottom

### Art style
- Clean sharp digital photography
- High contrast, stadium background bokeh
- Modern uniform, contemporary crop
- Legend cards: prismatic rainbow foil shimmer applied as CSS animation layer

### Prompt (locked)
```
Clean editorial portrait, sharp digital photography, modern baseball uniform,
stadium background blur, high contrast, contemporary sports photography,
photorealistic, crisp detail
```

### Samples log
| File | Status | Notes |
|------|--------|-------|
| *(none yet)* | — | — |

---

## Rarity treatments (CSS layer — not in portrait art)

| Rarity   | Border glow | Extra treatment |
|----------|-------------|-----------------|
| Common   | None        | Standard |
| Uncommon | `#34d399` subtle | Standard |
| Rare     | `#818cf8` medium | Standard |
| Legend   | `#f59e0b` strong | Prismatic CSS shimmer animation overlay |

---

## Output specs (ComfyUI pipeline)

| Parameter | Value |
|-----------|-------|
| Portrait dimensions | 512 × 720px (no frame) |
| Full card dimensions | 600 × 840px (portrait + frame) |
| Format | PNG with transparency |
| Naming | `[era]_[position]_[id].png` |
| Target volume | 60 portraits Phase 1 (15 per era) |
| Model | SDXL or Flux |
| Output to | `src/assets/cards/[era]/` |
| Pipeline scripts | `comfyui/` |

---

## Team identity (card header colors)

Card header/background color is driven by **team primary color**, not era color.

| Franchise | Era | City | Name | Primary | Secondary |
|-----------|-----|------|------|---------|-----------|
| irons | all | Chicago | Irons | `#1a2a4a` | `#8b2020` |
| pilgrims | all | Boston | Pilgrims | `#8b1a1a` | `#f5f0e8` |
| peaches | all | Atlanta | Peaches | `#1a4a2a` | `#f5a878` |
| foghorns | all | San Francisco | Foghorns | `#2a3a5a` | `#a0a8b0` |
| empire | deadball/golden | Brooklyn | Monuments | `#2a2a2a` | `#d4a520` |
| empire | hardball/modern | New York | Empire | `#1a1a3a` | `#d4a520` |
| rovers | hardball | Brooklyn | Sentinels | `#2a4a1a` | `#f0f0f0` |
| rovers | modern | Los Angeles | Rovers | `#c85a1a` | `#d4b896` |
| foundry | deadball/golden | Pittsburgh | Foundry | `#1a1a1a` | `#d4a520` |
| foundry | hardball/modern | Detroit | Foundry | `#1a4a6a` | `#d48820` |
| deltas | deadball | Baltimore | Tides | `#1a2a4a` | `#d46820` |
| deltas | golden+ | New Orleans | Deltas | `#1a4a2a` | `#d4a520` |
| cinders | deadball/golden | Philadelphia | Cinders | `#5a1a2a` | `#8a8a8a` |
| engines | deadball | Cincinnati | Engines | `#8b2020` | `#1a1a1a` |
| ramblers | golden/hardball | Kansas City | Ramblers | `#1a2a8a` | `#8b2020` |
| glare | modern | Miami | Glare | `#1a7a6a` | `#e05a40` |
| ascent | modern | Denver | Ascent | `#4a1a6a` | `#a0a8b0` |
