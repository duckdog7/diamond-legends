# ⬦ DIAMOND LEGENDS ⬦
## Game Design Document
**Version 1.4 · March 2026**
*A cross-era baseball card strategy game*

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [The Four Eras](#2-the-four-eras)
3. [Card System](#3-card-system)
4. [Roster Management](#4-roster-management)
5. [The At-Bat System](#5-the-at-bat-system)
6. [Power-Up & Token Economy](#6-power-up--token-economy)
7. [Season & Progression Structure](#7-season--progression-structure)
8. [Starting Experience & Onboarding](#8-starting-experience--onboarding)
9. [Player IP & Legal Framework](#9-player-ip--legal-framework)
10. [Development Roadmap](#10-development-roadmap)
11. [Technical Stack & Dev Environment](#11-technical-stack--dev-environment)
12. [Visual Design Direction](#12-visual-design-direction)
13. [Card Art Pipeline — ComfyUI](#13-card-art-pipeline--comfyui)
14. [Claude Code Kickoff Prompt](#14-claude-code-kickoff-prompt)

> **v1.4 Changes:** Zone budget system implemented and refined (§5.2, §5.11, §5.12). Contact resolution bonuses updated with implemented values (§5.4). Extra-base upgrade on type-correct guess (§5.5). Ball penalty mechanic finalized (§5.11). Game-end rule after top of 9th added (§5.12). At-bat screen layout and UX documented (§12.5). "Read" token noted for future (§6.5). Current state updated in §14.

---

## 1. Game Overview

Diamond Legends is a browser-based baseball strategy game combining card collection, team roster management, and tactical at-bat decision-making. Players build rosters of legendary fictional ballplayers drawn from four distinct historical eras, then guide their team through a full season and playoff run using strategy, prediction, and timing.

The game is not a baseball simulation. There is no physics engine, no batting animation, no fielding choreography. Instead, each at-bat is a compressed strategic duel: pitch prediction, zone reading, and probability management, shaped entirely by the cards and items in your collection.

> **CORE FANTASY:** Build the ultimate cross-era roster. Draft a 1920s contact hitter to lead off, slot a 1980s power slugger cleanup, and close games with a modern flamethrower. No era is strictly better — matchups decide everything.

### 1.1 Elevator Pitch

FIFA Ultimate Team meets Strat-O-Matic, set in a sepia-tinged world where Deadball Era legends share a dugout with modern day fireballers. Collect era-authentic player cards, build your 15-man roster, outsmart opposing managers in the pitch zone, and chase a championship dynasty across multiple seasons.

### 1.2 Genre & Platform

| Attribute | Detail |
|---|---|
| **Genre** | Strategy card game / baseball manager / light RPG |
| **Platform** | Browser-based (HTML5 / JavaScript) |
| **Player Count** | Single-player vs. AI (PvP in Phase 2) |
| **Session Length** | Single game: 15–25 min \| Full season: ongoing |
| **Monetization** | Free to play with cosmetic DLC (Phase 2) |

---

## 2. The Four Eras

Diamond Legends spans four distinct baseball eras. Each era has its own card visual language, statistical flavor, and exclusive traits. Players in earlier eras are not weaker — they are differently powerful, with skills and traits that reflect the baseball of their time.

| Era | Period | Card Style & Baseball Character |
|---|---|---|
| **The Deadball Era** | 1900–1919 | Sepia photo, hand-lettered type, cream stock. Small-ball specialists, place hitters, iron-armed pitchers who threw complete games. |
| **The Golden Age** | 1920–1959 | Glossy color portrait, bold sans-serif, team colors. Power hitters emerge. Dominant pitching rotations. The rise of the closer. |
| **The Hardball Era** | 1960–1989 | Topps-style card, action photo, full bleed color. Speed and power combine. Relief specialists and five-man rotations standard. |
| **The Modern Game** | 1990–Today | Clean flat design, data overlays, QR code corner. Analytics-driven. Extreme specialization: openers, lefty specialists, launch-angle hitters. |

### 2.1 Cross-Era Balancing

Stats are era-adjusted using a normalized scoring system. A Deadball hitter with a .380 batting average and a modern hitter with a .310 average might score identically on the Hitting for Average tool score, because their numbers are evaluated relative to their era's context.

- Each of the five tool scores (1–100) represents era-normalized ability, not raw statistics.
- Era-exclusive Traits (see Section 4.3) give older-era players unique abilities unavailable on modern cards.
- No single era dominates. The metagame evolves as players discover cross-era synergies.

### 2.3 Teams & Franchises

Diamond Legends features 13 fictional franchises across the 4 eras. Some franchises span the full history of the game; others are era-specific (defunct leagues, expansion teams). Several franchises relocate between eras, carrying their identity forward under a new city name.

**Franchises That Span All Eras**

| Franchise | Era Coverage | Colors |
|---|---|---|
| Chicago Irons | All eras | Navy / Brick Red |
| Boston Pilgrims | All eras | Deep Red / Cream |
| Atlanta Peaches | All eras | Forest Green / Peach |
| San Francisco Foghorns | All eras | Slate Blue / Silver |

**Franchises That Relocate**

| Franchise | Era | Relocation Note |
|---|---|---|
| Brooklyn Monuments | Deadball / Golden Age | Becomes New York Empire in Hardball and Modern eras |
| New York Empire | Hardball / Modern | Relocated from Brooklyn Monuments |
| Brooklyn Sentinels | Hardball only | Becomes Los Angeles Rovers in Modern era |
| Los Angeles Rovers | Modern | Relocated from Brooklyn Sentinels |
| Pittsburgh Foundry | Deadball / Golden Age | Becomes Detroit Foundry in Hardball and Modern eras |
| Detroit Foundry | Hardball / Modern | Relocated from Pittsburgh Foundry |
| Baltimore Tides | Deadball only | Becomes New Orleans Deltas from Golden Age onward |
| New Orleans Deltas | Golden / Hardball / Modern | Relocated from Baltimore Tides |

**Era-Specific Franchises**

| Franchise | Era Coverage | Notes |
|---|---|---|
| Philadelphia Cinders | Deadball / Golden Age | Folded post-WWII |
| Cincinnati Engines | Deadball only | Early franchise, collapsed |
| Kansas City Ramblers | Golden Age / Hardball | Defunct after Hardball era |
| Miami Glare | Modern only | Expansion franchise |
| Denver Ascent | Modern only | Expansion franchise |

> **FRANCHISE ID:** Each franchise has a unique `franchiseId` used in card data (e.g. `irons`, `pilgrims`, `peaches`). Relocating franchises share a `franchiseId` root across their identities. The `franchiseId` links card data to team colors, logo assets, and name resolution at display time.

---

## 3. Card System

### 3.1 Card Anatomy

Every player card contains the following elements:

| Element | Description |
|---|---|
| **Player Name** | Fictional legend name (e.g. `Hank "The Hammer" Broussard`) |
| **Era Badge** | Color-coded era icon (Deadball / Golden / Hardball / Modern) |
| **Position** | Primary position + secondary positions (e.g. `1B / OF`) |
| **Five Tool Scores** | Five 1–100 scores, each letter-graded A+ through F |
| **Overall Rating** | Weighted composite of the five tools (displayed prominently) |
| **Era Trait** | 1–2 word ability label (e.g. `Iron Arm`, `Gap Hitter`) |
| **Rarity Tier** | Common / Uncommon / Rare / Legend |
| **Card Art** | Photo-realistic portrait in era-accurate card style. Card background color driven by team primary color, not era color. |
| **Card Number** | Era-specific format: Deadball = plain numeral centered (e.g. `12`) \| Golden Age = numeral in star/pennant top-left (e.g. `#476`) \| Hardball = alphanumeric color block banner (e.g. `20T`, `88`) \| Modern = numeral top-right with series designation (e.g. `231 · SERIES ONE`) |
| **Franchise ID** | Links card to franchise for team color, logo, and name resolution |
| **Height / Weight / Birthplace** | Physical bio info — displayed on card detail view |
| **Bats / Throws** | Handedness — displayed on card detail view |
| **Career Stats** | Season-by-season table (G, AB, H, R, RBI, AVG, SLG + five tool scores per season). Grows each season in dynasty mode. |
| **Flavor Text** | One short evocative line in period-appropriate voice |
| **Diamond Legends Brand Mark** | Replaces Topps logo. Deadball: subtle diamond outline + copyright DL (tobacco watermark feel). Golden/Hardball: white outline diamond with DL inside, top-right corner. Modern: gold outline diamond with gold DL, slightly more prominent. |

### 3.2 The Five Tools

Baseball's traditional five-tool scouting framework forms the mechanical backbone of every player card. All tools are scored 1–100 and letter-graded for quick reading.

| Tool | What It Represents | Mechanical Effect |
|---|---|---|
| **Hitting for Average** | Contact / Plate Discipline | Affects pitch prediction accuracy bonus and zone reading. High-average hitters 'see' the ball better — the pitch zone grid reveals more information before they guess. |
| **Hitting for Power** | Raw Power / Launch | Determines run scoring potential when a ball is put in play. High power hitters convert hits to extra bases more often. Powers the home run system. |
| **Running Speed** | Sprint / Baserunning IQ | Affects stolen base success, taking extra bases, and avoiding double plays. Enables baserunning power-ups during play. |
| **Fielding (Glove)** | Range / Sure Hands | Reduces opponent scoring on balls in play. High fielding cards trigger better defensive events. Key stat for defensive substitution strategy. |
| **Arm Strength** | Throwing Power / Accuracy | Affects outfield assist frequency, catcher throwing out baserunners, and pitcher velocity. Pitchers with high Arm Strength have a larger effective pitch zone. |

### 3.3 Rarity Tiers

Rarity in Diamond Legends is situational, not absolute. A Legend-tier card is not always better than a Rare — it is more powerful in specific situations, creating a metagame of matchup building rather than pure power accumulation.

| Rarity | What It Means |
|---|---|
| **Common** | Baseline players. Solid one-tool contributors. Good depth pieces. Easy to acquire from any draft pack. |
| **Uncommon** | Two-tool specialists. Reliable starters. Appear frequently in mid-tier packs. Good synergy pieces. |
| **Rare** | Elite performers in 1–2 tools with a meaningful Era Trait. Situationally dominant. Core of most winning rosters. |
| **Legend** | Cross-era icons. All-tool contributors with a Legendary Trait that bends or breaks a normal game rule. One per roster max. |

---

## 4. Roster Management

### 4.1 Roster Structure

Each team carries a 15-man active roster split into starters and a bench with specialist roles.

| Role | Details |
|---|---|
| **Starting Lineup (9)** | One player per position: C, 1B, 2B, 3B, SS, LF, CF, RF, SP |
| **Bench (5–6)** | Backup C, utility INF, OF depth, 2–3 Relief Pitchers |
| **Rotation** | 1 Starting Pitcher active per game; others rest between series |
| **Legend Slot** | Only one Legend-tier card may appear on the active roster at a time |

### 4.2 Hot & Cold Streaks

Players carry a Momentum Rating that shifts based on recent performance across the last 5–7 games. This creates natural rotation incentives and roster decisions that feel dynamic rather than static.

> **HOT 🔥** — 3+ game hitting streak or 2+ quality starts in a row. +10 to all tool scores for that player. Visual flame indicator on card.

> **COLD 🧊** — 0-for-12 slump or 2 consecutive rough starts. –10 to all tool scores. Blue tint on card. Pinch-hit / platoon trigger.

### 4.3 Era Traits

Every non-Common card carries one Era Trait — a short mechanical keyword that triggers under specific conditions. Traits are not skills to level up; they activate or they don't, based on game state.

| Trait | Category | Effect |
|---|---|---|
| **Iron Arm** (Deadball) | Pitching | Starter may pitch 2 consecutive games in a series without fatigue penalty |
| **Place Hitter** (Deadball) | Batting | May choose which zone the ball goes to on contact (once per game) |
| **Gap Hitter** (Golden) | Batting | Doubles and triples count as RBI opportunities even with 2 outs |
| **Speedster** (Golden) | Baserunning | Stolen base success rate +20%. Activates a free steal attempt per game. |
| **Stopper** (Hardball) | Pitching | Relief pitcher eliminates momentum bonus from opposing hot streak |
| **Plate Discipline** (Hardball) | Batting | Batter sees one extra pitch per at-bat before committing to a guess |
| **Launch Angle** (Modern) | Batting | Power hits have +15% home run conversion rate |
| **Opener** (Modern) | Pitching | Can be used as a first-inning specialist with no fatigue cost |
| **Closer** (Modern) | Pitching | Zone effectiveness +15% in the 9th inning only |
| **Switch Hitter** (Any) | Batting | Nullifies any pitcher's platoon advantage trait |

---

## 5. The At-Bat System

The at-bat is fully turn-based. There is no swing timing, no reflexes, no button presses. Every decision is deliberate — the player studies available information, makes predictions, and commits. This is a strategy game that happens to be about baseball, not a baseball game with strategy bolted on.

> **DESIGN PRINCIPLE:** Fewer runs early is a feature, not a bug. Information is the resource that earns runs. The game rewards patience, observation, and smart token conservation — not reflexes.

### 5.1 The Complete At-Bat Resolution Chain

Every pitch follows this exact sequence. Implement this as a state machine — each step gates the next.

| Step | What Happens |
|---|---|
| **Step 1: Pitcher Selects** | Manager chooses a zone (1 of 9) and a pitch type (from repertoire). Both are constrained by statistical budgets — neither is a free choice. |
| **Step 2: Batter Predicts** | Manager selects a predicted zone and a predicted pitch type. Fully turn-based — no time pressure. Power-ups may be spent here to gain information before committing. |
| **Step 3: Contact Quality** | Prediction accuracy determines dice pool size. Both correct = full pool. One correct = reduced. Both wrong = no contact. |
| **Step 4: Ball Flight** | If contact: pitch type + contact zone determines where the ball travels on the field. Nine field locations, each mapped to a specific fielder position. |
| **Step 5: Ball Difficulty** | Contact quality + field location produces a difficulty rating for the defensive play (Routine / Moderate / Difficult / Exceptional). |
| **Step 6: Defensive Roll** | Fielder's Glove score vs. difficulty rating produces a success probability. Weighted roll — not binary pass/fail. Arm score determines runner advancement if play is made. |
| **Step 7: Result** | Out / Single / Extra Base / Error / Home Run. Tokens awarded to appropriate pool. Hot/cold streak updated. Pitch logged to history trail. |

### 5.2 Dual Statistical Budgets — Zone & Pitch Type

The pitcher is constrained by two independent budgets, both visible to the batter from the first pitch. This is the core information asymmetry of the game: the batter knows the distribution but not the next selection. The pitcher knows their own budget state but not which guess the batter will make.

| Budget | How It Works |
|---|---|
| **Zone Budget** | Each pitcher card has a pre-allocated pitch count per zone, distributed from their total pitch budget (`maxPitches`, derived from Arm Strength: ~arm×0.67+43). Distribution is weighted by the pitcher's combined zone affinities across their repertoire, then sharpened with a power function (exponent 1.8) to concentrate pitches into the pitcher's true tendencies — some zones get many, some few. The zone grid displays the **remaining count** per zone, not a percentage. As pitches are thrown, the count decrements. A zone at 0 is fully depleted: the pitcher cannot target it, the AI will not select it, and the zone displays a red ✕. Budget resets on reliever entry. |
| **Pitch Type Budget** | Each pitch type in the pitcher's repertoire has a usage percentage (e.g. Fastball: 55%, Slider: 25%, Changeup: 20%). Budget tracks actual pitch type usage. Overuse of a pitch type degrades its effectiveness — AI batter up-weights that type heavily in its predictions. Also resets on reliever entry. |

> **KEY TENSION:** The pitcher manager is simultaneously managing two depleting budgets while trying to keep the batter off-balance. The batter manager is tracking both budgets to find the intersection of 'zone running low' AND 'pitch type running low' — that intersection is the high-confidence late-game prediction.

> **CONTROL CHECK:** Each pitch generated by the AI has a control probability based on Arm Strength (base ~42–67%), modified by zone difficulty (corners hardest, center easiest) and fatigue. A pitch that fails the control check lands outside the strike zone (`isInZone = false`). If the batter takes this pitch, it is a ball.

### 5.3 Pitch Type Roster

Each pitcher card carries a Pitch Repertoire of 2–4 pitch types drawn from the list below. Era availability reflects historical baseball — Deadball pitchers don't throw Sliders, Modern pitchers rarely throw Curveballs as a primary pitch.

| Pitch Type | Mechanics & Contact Effect | Era & Requirements |
|---|---|---|
| **Fastball (FB)** | High zone affinity. If both zone and type correct: full power dice pool. If type wrong: timing disruption even on correct zone — pool -1 die. Ball flight: line drives and fly balls, middle-to-deep outfield. | All eras. Arm Strength score increases FB effectiveness modifier. |
| **Curveball (CB)** | Natural Low-Away affinity. Both wrong: automatic swing-and-miss (no contact roll). Both correct: highest hit quality potential — slowest pitch gives batter most time. Ball flight: pulled ground balls, infield left side. | Deadball, Golden, Hardball. Rare in Modern repertoires. |
| **Changeup (CH)** | Same zone affinity as Fastball — deliberate deception. Zone correct + type wrong: contact quality drops one full tier regardless of dice pool. Punishes pattern-following batters who key on location only. Ball flight: soft contact, infield right side and shallow OF. | Golden Age onward. Most effective vs. high-Average batters. |
| **Slider (SL)** | Low-Inside affinity. In pitcher's counts (0-2, 1-2): +15% effectiveness. On waste pitches: breaks out of zone, batter who chases gets automatic miss. Left over the plate: highly hittable. Ball flight: ground balls, infield middle. | Hardball Era onward. Requires Arm Strength 65+. |
| **Sinker (SK)** | Mid-to-Low affinity. Heavy downward movement. Double play probability +20% on contact. Fewer strikeouts but defense-friendly. Ball flight: almost exclusively ground balls — infield and shallow infield. | All eras under different names. Deadball: 'Drop Ball'. High value with strong infield defense. |
| **Cut Fastball (CF)** | High-to-Mid Inside affinity. Breaks toward batter's hands. Jams hitters: Power dice pool -1 die on any contact. Ball flight: weak contact to infield right, broken-bat pop-ups. | Modern era primarily. Deadball equivalent: 'In-Shoot'. |
| **Knuckleball (KN)** | Ignores both zone and pitch type budgets entirely. Location semi-random within a 3-zone spread. Batter and pitcher both operate with reduced certainty. Does not accumulate zone fatigue or pitch type fatigue. Ball flight: unpredictable — all field zones equally probable. | Legend-tier pitcher cards only, all eras. Rare by design. |

### 5.4 Contact Quality — Prediction Accuracy Table

Contact quality is determined by prediction accuracy combined with a roll against the batter's tools.

| Prediction Result | Contact Tier Thresholds | Roll Bonus |
|---|---|---|
| **Both Correct** | Barrel ≥82 \| Hard ≥58 \| Solid ≥30 \| Weak ≥12 | +18 to roll |
| **Zone Correct / Type Wrong** | Same thresholds | +8 to roll |
| **Type Correct / Zone Wrong** | Same thresholds | +4 to roll |
| **Both Wrong** | No contact possible | +0 |

The roll itself is a random draw modified by the batter's Average tool score (scaled ±12), fatigue penalties, and the prediction bonus above. The roll result determines contact tier: **Barrel** → maximum power; **Hard** → strong contact; **Solid** → in-play hit likely; **Weak** → soft contact, out likely; **None** → swing and miss or foul. A base dice pool of 5 is used at Both Correct, reduced for lower prediction accuracy.

> **IMPLEMENTED VALUES (engine):** `BASE_POOL = 5` | Barrel ≥82, Hard ≥58, Solid ≥30, Weak ≥12 | Prediction roll bonus: bothCorrect +18, zoneCorrectTypeWrong +8, typeCorrectZoneWrong +4, bothWrong 0.

### 5.5 Ball Flight — Pitch Type × Contact Zone Matrix

When contact is made, the combination of pitch type thrown and the contact zone determines where the ball travels on the field. This is a lookup — not random. It maps directly to a fielder position and a difficulty rating.

> **TYPE-CORRECT EXTRA BASE BONUS:** When the batter correctly predicts the pitch type (regardless of zone), the ball flight result upgrades its `extraBaseRisk` one tier: `none → low`, `low → high`. This rewards pitch type reading with meaningfully better extra-base outcomes — rewarding knowledge, not just location guessing.

| Pitch Type + Contact Zone | Field Location | Fielder & Notes |
|---|---|---|
| FB + High zone contact | Deep Center / Deep Right-Center | CF primary. Long range play. Arm strength critical for hold. |
| FB + Mid zone contact | Deep Left / Left-Center Gap | LF primary. Gap hit likely on full contact. |
| FB + Low zone contact | Shallow Center / Right field line | CF or RF. Moderate difficulty. |
| CB + High zone contact | Infield Left (3B/SS side) | 3B or SS. Moderate-to-difficult depending on pull strength. |
| CB + Mid zone contact | Pulled Ground Ball — Infield Left | SS primary. Routine-to-moderate difficulty. |
| CB + Low zone contact | Hard Pull — Down 3B Line | 3B. Difficult play, extra base likely on success. |
| CH + High zone contact | Infield Right (2B/1B side) | 2B or 1B. Routine difficulty. Soft contact. |
| CH + Mid zone contact | Shallow Right Field | RF. Routine fly ball. Low extra base risk. |
| CH + Low zone contact | Weak Infield — Up the Middle | 2B or SS. Routine. Double play opportunity if runners on. |
| SL + any contact | Ground Ball — Infield Middle | SS or 2B. Moderate. Double play probability elevated (+20%). |
| SK + any contact | Hard Ground Ball — Infield | SS, 2B, or 3B. Moderate-to-difficult. Double play prime candidate. |
| CF + any contact | Weak Pop-Up or Infield Right | 2B or 1B. Routine. Broken-bat quality. |
| KN + any contact | Random — any of 9 field zones | Random fielder. Difficulty also random. Knuckleball chaos by design. |

### 5.6 Field Zone Map — Nine Defensive Locations

The field is divided into nine zones mirroring the pitch zone grid symmetry. Each zone maps to a primary fielder and an Arm Strength consideration for runner advancement.

| Field Zone | Primary Fielder | Arm Strength Matters? |
|---|---|---|
| Infield Left | 3B / SS | Yes — throw to 1B across diamond |
| Infield Middle | SS / 2B | Yes — pivot throw, double play potential |
| Infield Right | 2B / 1B | Less — short throw |
| Shallow Left | LF | Yes — throw to cut-off, hold runner at 1B |
| Shallow Center | CF | Yes — hold runners, arm matters |
| Shallow Right | RF | Yes — throw to 2B or cut-off |
| Deep Left | LF | Critical — arm determines 2B vs 3B |
| Deep Center | CF | Critical — range + arm, gap hit territory |
| Deep Right | RF | Critical — arm determines 2B vs 3B |

### 5.7 Defensive Resolution — Probability Gradient

Defensive plays are resolved using a probability gradient, not a binary pass/fail roll. A fielder's Glove score sets a weighted success probability against the difficulty of the play. Better fielders fail less — they don't suddenly become bad. This prevents outcomes that feel arbitrary while preserving the drama of exceptional plays.

| Difficulty | Play Description | Success Probability by Glove Score |
|---|---|---|
| **Routine** | Standard play, good position | Glove 80+: 98% \| Glove 60: 90% \| Glove 40: 78% |
| **Moderate** | Moving play, awkward bounce | Glove 80+: 85% \| Glove 60: 72% \| Glove 40: 55% |
| **Difficult** | Full extension, range play | Glove 80+: 65% \| Glove 60: 48% \| Glove 40: 30% |
| **Exceptional** | Diving, wall, relay throw | Glove 80+: 35% \| Glove 60: 20% \| Glove 40: 8% |

If the defensive play succeeds: out recorded. Arm Strength then determines runner advancement — high Arm holds runners, low Arm allows the extra base. If the defensive play fails: hit recorded. Contact quality + field zone depth determines single vs. extra base vs. inside-the-park possibility.

### 5.8 Token Influence on Ball Flight

Batting tokens can redirect ball flight before the defensive resolution step. These are the only batter-side tokens that affect where the ball goes rather than prediction accuracy.

| Token Play | Effect |
|---|---|
| **Pull Shift (2 tokens)** | Moves ball flight one zone toward the pull side. E.g. Shallow Center becomes Shallow Left, Deep Right becomes Deep Center. |
| **Oppo Push (2 tokens)** | Moves ball flight one zone toward opposite field. Forces the ball away from an overloaded pull defense. |
| **Gap Finder (4 tokens)** | Forces ball flight into the nearest gap zone (Left-Center or Right-Center). High extra base probability. Cannot be used on infield contact results. |
| **Infield In (3 tokens)** | Converts any shallow OF or infield result to a slow roller — maximizes time pressure on infield Arm scores. Useful with runners in scoring position. |

### 5.9 The Dramatic Arc — Innings as Information Phases

A 9-inning game divides naturally into three phases as pitch history trail data accumulates and budgets deplete.

| Phase | State of Play | Strategic Priority |
|---|---|---|
| **Innings 1–3: The Dark** | Low information. Batter works from tendency percentages only — no trail data yet. Low scoring. Patient batters work counts to build trail faster. Pitcher has maximum zone and type freedom. | Batter: take pitches, build trail, conserve tokens. Pitcher: establish zones early, set patterns you'll break later. |
| **Innings 4–6: The Read** | Pattern recognition kicks in. 30–40 pitches logged. Zone and type budget depletion visible. Batters can make educated dual predictions. Pitcher must start disguising or burning low-percentage options. | Batter: exploit depleted budgets, spend Spark tokens freely. Pitcher: mix pitch types to obscure type budget, consider early reliever. |
| **Innings 7–9: The War** | Full information. Both budgets strained. Tokens accumulated. Every at-bat is a high-stakes resource deployment. Reliever swap resets all information — nuclear option at the cost of roster depth. | Both: deploy Surge and Blitz tokens. Pitcher: reliever timing is the decisive call. Batter: Scouting Report Blitz counters the information reset. |

### 5.10 Ball Penalty — Zone Budget Drain on Wild Pitches

When a pitcher throws a ball (pitch out of zone, batter takes), the normal zone budget decrement still happens for the targeted zone. Additionally, a proportional penalty drains the remaining zone budgets across all zones.

**Mechanism:** After recording the pitch, each zone loses `Math.round(remainingBudget[zone] / totalRemaining)` pitches. With standard rounding, a zone representing ≥50% of the remaining total budget loses 1 additional pitch; others lose 0.

**Design intent:** Early in the game, budgets are balanced across 9 zones (~11% each), so balls carry minimal additional penalty. As the game progresses and some zones deplete, the remaining concentrated budget becomes increasingly fragile — balls thrown late become significantly more costly, de-incentivizing wild pitching when the pitcher needs their remaining zones most.

> **STRATEGIC NOTE:** This mechanic creates a late-game tension: the pitcher who consistently targets corners (high error rate) will find their remaining core zones drained faster. A pitcher who establishes zone discipline early preserves more budget for critical late-inning situations.

### 5.11 Game End Rule — Home Team Walk-Off (Top of 9th)

Following official baseball rules, the game ends immediately after the top of the 9th inning if the home team is already winning. The home team does not bat in the bottom of the 9th when leading.

- If `half === 'top'` and `inning >= 9` and `score.home > score.away` at the end of any plate appearance, the game is immediately declared over.
- The home team wins without playing the bottom of the 9th.
- In extra innings (if implemented in future), the same rule applies every half-inning after the 9th.

### 5.13 The Reliever — Information Reset

When a reliever enters, the entire information state resets: pitch history trail clears, both zone and pitch type budgets refresh to full, and the tendency profile updates to the new pitcher's card. The batter manager is back to the Dark Phase.

- Fatigue is tracked by pitches thrown, not innings. A starter at high fatigue has -15% zone effectiveness — visible to both managers.
- The batting manager must weigh: keep hitting a tired starter whose budgets are known and depleted, or face a fresh unknown reliever at full budget.
- Counter-play: the Blitz-tier Scouting Report (10 batting tokens) immediately reveals the reliever's full tendency profile and pitch type repertoire on entry — negating the information reset at high cost.
- Relievers have smaller pitch repertoires (typically 2 pitch types) but fresher budgets and higher per-pitch effectiveness.

---

## 6. Power-Up & Token Economy

Power-ups are earned through performance — never purchased or drafted. The token economy runs on two separate pools (Batting Tokens and Pitching Tokens) that cannot be exchanged. This ensures each side of the ball earns its own advantages and rewards roster balance.

> **CONSERVATION PRINCIPLE:** Tokens must be metered across the full game. Early power-ups are tempting but cheap boosts. The game-changing Blitz-tier plays cost 10 tokens — players who dump everything in the 3rd inning arrive at the 8th inning defenseless against a fresh reliever.

### 6.1 Dual Token Pools

| Pool | Earn & Spend Rules |
|---|---|
| **Batting Tokens** | Earned by: Base hits, extra base hits, RBIs, stolen bases, walks drawn. Spent on offensive power-ups only. |
| **Pitching Tokens** | Earned by: Strikeouts, double plays induced, stolen bases caught, scoreless innings. Spent on defensive/pitching power-ups only. |

### 6.2 Tiered Power-Up Menu

Power-ups are available from a persistent in-game menu, spendable at any point before a pitch is committed.

| Tier & Cost | Pool | Effect |
|---|---|---|
| **SPARK — 1 token** | Batting | Momentum Chip: +5 prediction accuracy bonus this at-bat only. |
| **SPARK — 1 token** | Batting | Focus: Reveal whether pitcher's next pitch will be in upper or lower half of zone (directional hint only). |
| **SPARK — 1 token** | Pitching | Locate: Pitcher ignores zone fatigue penalty for one pitch. |
| **SPARK — 1 token** | Pitching | Disruption: AI batter's confidence reduced — it down-weights its highest-probability zone guess this pitch. |
| **BOOST — 3 tokens** | Batting | Hot Bat: Batter's Power score +15 for this at-bat. Dice pool gains 1 bonus die. |
| **BOOST — 3 tokens** | Batting | Plate Eye: Batter sees pitch type before committing zone prediction this pitch. |
| **BOOST — 3 tokens** | Pitching | Filthy Pitch: One pitch this at-bat ignores zone budget — does not deplete or trigger fatigue. |
| **BOOST — 3 tokens** | Pitching | Shutdown: Nullifies the next offensive power-up the opponent plays this inning. |
| **SURGE — 6 tokens** | Batting | Zone Freeze: Lock one zone — pitcher cannot throw there for the rest of this at-bat. |
| **SURGE — 6 tokens** | Batting | Diamond Rush: Next 2 batters in lineup each get +10 to all tool scores this inning. |
| **SURGE — 6 tokens** | Pitching | Brick Wall: Reduces opponent's RBI probability by 30% for the remainder of this inning. |
| **SURGE — 6 tokens** | Pitching | Pitch Clock: AI batter's prediction window is shortened — it cannot use trail data this at-bat (simulates deception). |
| **BLITZ — 10 tokens** | Batting | Scouting Report: Immediately reveals reliever's full tendency profile and pitch repertoire on entry. Negates information reset. |
| **BLITZ — 10 tokens** | Batting | Clutch Gene: Next at-bat, if batter gets zone + type correct, result auto-upgrades one tier (Single becomes Double, Double becomes HR, etc.). |
| **BLITZ — 10 tokens** | Pitching | Ace Mode: Pitcher's entire zone effectiveness +20% for one full inning. Zone fatigue does not accumulate. |
| **BLITZ — 10 tokens** | Pitching | Cold Read: Reveals which power-ups the batting manager is currently holding. Strategic intel only — does not remove them. |

### 6.3 Token UI — Known Issue

The current token UI is intentionally minimal and the power-up menu is not prominently surfaced in the at-bat screen. Token visibility and discoverability are flagged for a UX pass in Phase 1. The menu exists and is functional; the issue is presentation and accessibility.

### 6.4 Planned Token — "Read" (Future)

> **DESIGN NOTE — NOT YET IMPLEMENTED**
>
> A "Read" token has been identified as a high-value future addition to the Batting token pool. The Read token would reveal whether the incoming pitch will be **in-zone or out-of-zone before the batter commits to swinging or taking**. This addresses the asymmetry where pitchers can throw balls cheaply because batters have no visual signal that a pitch will be wild (unlike a real game where a pitch-out or wild delivery is visually obvious). The Read token gives the batter meaningful agency over pitch selection without requiring a swing/timing mini-game.
>
> Cost tier TBD — likely BOOST (3 tokens). Implementation requires surfacing `isInZone` from the pitch AI before the batter input step, which will require engine sequencing changes. Defer to Phase 1 completion milestone.

### 6.6 Token Expiry

To prevent pure hoarding, a soft expiry system applies to Spark-tier tokens only. Spark tokens older than 3 innings expire unused. Boost, Surge, and Blitz tokens never expire — they are worth saving.

### 6.4 Equipment Items

Equipment items are permanent card upgrades earned through season milestones and playoff performance. They modify base card stats and unlock passive effects — not one-time plays.

| Item | Slot | Effect |
|---|---|---|
| **Corked Bat** | Batting | Power score +8 permanently. Once per season: flagged and removed in a narrative umpire event — adds drama. |
| **Golden Glove** | Fielding | Glove score +12. Auto-upgrades one defensive outcome per game from Single to Out. |
| **Rocket Arm Brace** | Pitching/Throwing | Arm Strength +10. Grants one free Filthy Pitch per game (no token cost). |
| **Lucky Pine Tar Rag** | Batting | Hitting for Average +6. On full count: batter gets one free zone re-prediction before pitch resolves. |
| **Spitball Flask** | Pitching | Once per game: pitch ignores batter hot zone overlay entirely. Era-restricted: Deadball and Golden Age only. |
| **Radar Gun Specs** | Catching | Passive: 10% chance per pitch to reveal pitcher's intended zone before the batter commits. Scouting intel. |
| **Speed Cleats** | Baserunning | Running Speed +8. First stolen base attempt each game auto-succeeds. |
| **Worn Scouting Notebook** | Manager | Passive: Pitch history trail shows count-state breakdown (what pitcher throws on 0-2 vs 2-0 counts specifically). |

---

## 7. Season & Progression Structure

### 7.1 Season Arc

A full Diamond Legends season consists of a regular season, a playoff bracket, and a dynasty carry-over into the next season.

| Phase | Details |
|---|---|
| **Regular Season** | ~30 games organized into 10 three-game series against AI opponents of escalating difficulty |
| **Series Format** | 3 games per series. Split series (1-2 or 2-1) are common. Sweeps earn bonus pack credits. |
| **Rotation Fatigue** | Starting pitchers need 4 days rest between starts. Managing your rotation across a 3-game series is the key strategic layer. |
| **Pinch Hitting** | Any bench position player may be subbed in for any at-bat. Hot/cold status influences this decision. |
| **Playoff Round** | Top 8 AI + player teams enter a bracket. Best-of-5 series. No rest for pitchers between games — rotation depth matters. |
| **Dynasty Carry-Over** | Full roster carries into Season 2. Players age (see 7.3). New era packs become available. Season 1 champion gets a Legacy Card. |

### 7.2 Draft Pack System

Cards are earned exclusively through gameplay — there are no purchases.

| Pack Type | Contents & Trigger |
|---|---|
| **Starter Pack** | 15 cards drawn from a pool of 30. Common/Uncommon only. Granted at game start — player chooses a focused pool. |
| **Series Win Pack** | 3 cards: 2 Uncommon, 1 Rare. Earned by winning any 3-game series. |
| **Series Sweep Pack** | 5 cards: 3 Rare, 2 Uncommon. Earned by sweeping a 3-game series 3-0. |
| **Season Milestone Packs** | Awarded at 10 wins, 20 wins, and season completion. Contains era-specific themed cards. |
| **Playoff Pack** | Awarded for each playoff round won. 1 guaranteed Legend-tier card for championship victory. |
| **Era Focus Pack** | Awarded for winning a series against an era-themed opponent. All 5 cards from that specific era. |

### 7.3 Player Aging & Dynasty

In Season 2 and beyond, player cards age. This is a light system — not punishing, but meaningful. It rewards building a pipeline, not just stacking one super-roster.

- Players have a Career Stage: Prospect, Prime, Veteran, Legend (career stage, not rarity tier).
- Prime players perform at full tool scores. Veterans take a –5 to one tool per season. Legends are immune to aging.
- Prospects start at 70% of their potential tool scores and grow 5–10 points per season if played regularly.
- Retiring a Veteran unlocks a Memorial Card — a cosmetic variant with their career stats etched on it.

> **DATA NOTE:** Cards in `cards.json` carry a `careerStage` field: `prospect`, `prime`, `veteran`, or `legend` (career stage). This is distinct from the rarity tier field which also has a `legend` value. Both fields exist independently on a card — a Rare-rarity card can have a `legend` career stage, and a Legend-rarity card starts in `prime` career stage. The aging mechanic is present in the data schema but not yet implemented in the game engine — planned for Phase 1 completion.

---

## 8. Starting Experience & Onboarding

### 8.1 The Draft

New players begin with the Draft: a curated pool of 30 Common and Uncommon cards from all four eras. They select 15 to form their opening roster.

- Pool is balanced: 7–8 cards per era, with each position represented at least once.
- Player sees full card stats, Era Trait, and card art before selecting — no blind picks at the start.
- Draft is position-aware: the UI highlights roster gaps as you build (e.g. 'You need a catcher').
- After draft, a short tutorial series (3 games vs. easy AI) teaches pitch zone mechanics with in-context tooltips.

### 8.2 Tutorial Progression

| Tutorial Stage | Focus |
|---|---|
| **Game 1 — The Basics** | Batting only. AI pitches slowly. Grid explained. One power-up is given free to demonstrate the system. |
| **Game 2 — Both Sides** | Player pitches one inning, bats the rest. Zone decay introduced. Era Traits explained in context. |
| **Game 3 — Full Game** | All systems active. Hot/cold streaks explained post-game. Roster management screen introduced. |
| **Post-Series** | Player receives their first Series Win Pack. Draft pack UI explained. Season begins. |

---

## 9. Player IP & Legal Framework

### 9.1 Fictional Players Only

Diamond Legends uses entirely fictional players. No real MLB player names, likenesses, or statistics are reproduced. This is a deliberate creative and legal choice that enables the game's mythology-building approach.

> **RATIONALE:** Right of publicity laws survive death in many US states (CA extends 70 years post-death). MLBPA group licensing applies to historical players used commercially. Fictional legends inspired by eras carry zero licensing exposure while enabling richer creative storytelling.

### 9.2 Fictional Legend Design Guidelines

Each fictional player should feel like a composite archetype of their era — immediately recognizable in spirit without being a direct likeness of any real person. The card art, name, and flavor text work together to evoke the era rather than reference specific individuals.

- Names use period-appropriate given names and regional surnames (e.g. Deadball: Cornelius, Beaumont, Beauchamp; Modern: Marcus, DeShawn, Tyler).
- Card art is photo-realistic in style but clearly stylized/illustrated — not photographic likenesses of real people.
- Flavor text uses period-appropriate voice (e.g. Deadball: newspaper column prose; Modern: broadcast soundbite style).
- Stats are inspired by era norms but not derived from any individual player's record.

### 9.3 MLB & Baseball References

Generic baseball terminology, team color palettes, and position names are not protectable and may be used freely. The game may reference historical eras, statistics concepts, and baseball culture without restriction. Diamond Legends does not use any MLB team names, logos, or copyrighted broadcast material.

---

## 10. Development Roadmap

### Phase 1 — Core Game (MVP)

- Full card system: 60 cards across 4 eras, all rarities represented
- 9-inning game engine with pitch zone grid, zone decay, full pitch count
- 15-man roster management, hot/cold streak system
- Draft pack system and starter draft flow
- 30-game regular season + playoff bracket vs. AI opponents
- Power-up economy (performance-triggered drops)
- Equipment item system (6 items)
- Dynasty carry-over into Season 2
- Full tutorial sequence

### Phase 2 — Expansion

- Mini-games: pitch location timing press (accuracy meter), fielding throw timing
- PvP mode: async matchmaking, real-time option
- Expanded card pool: 120+ cards, legendary variant art
- Era Challenge events: special limited series with era-locked rosters
- Player aging full implementation + prospect development
- Cosmetic DLC: alternate card frames, stadium skins, manager avatar
- Mobile-optimized touch interface

### Phase 3 — Live Game

- Season-based live events with limited-edition Legend cards
- Community draft pools (community votes on new card additions)
- Historical scenario modes (e.g. 'Win the 1927 World Series with a mixed-era roster')
- Trade system between players (card exchange, not sales)

---

## 11. Technical Stack & Dev Environment

### 11.1 Frontend Stack

| Layer | Choice & Rationale |
|---|---|
| **Framework** | React (via Vite for fast local dev and HMR) |
| **Language** | JavaScript (ES2022+) — TypeScript optional in Phase 2 |
| **Styling** | Tailwind CSS for scoped, era-aware theming |
| **Animation** | Framer Motion for card animations, zone pulses, power-up reveals |
| **State Management** | Zustand (lightweight) for game/roster/season state |
| **Data** | JSON flat files for card definitions, season schedule, AI team configs |
| **Build Tool** | Vite — fast HMR, simple config, outputs a static site |
| **IDE** | VS Code with ESLint + Prettier configured from day one |

### 11.2 Local Development Setup

The game runs entirely in the browser with no backend required for Phase 1. All game state is managed client-side.

- Prerequisites: Node.js 18+ installed on local machine
- Project scaffolded with: `npm create vite@latest diamond-legends -- --template react`
- Dev server: `npm run dev` — runs on `localhost:5173` with hot module reload
- No database, no auth, no backend in Phase 1 — pure client-side React
- Game state persists via `localStorage` between sessions (season progress, card collection, roster)
- Card art assets: PNG files in `/src/assets/cards/` organized by era subfolder

### 11.3 Project Structure

Actual folder structure as built. Two divergences from original plan: `/pipeline/` was added for the SVG logo generator, and `/comfyui/` contains Python scripts rather than workflow JSONs.

| Folder | Contents |
|---|---|
| `/docs` | GDD and design reference documents |
| `/public` | Static assets (fonts, favicon, stadium ambient audio) |
| `/src/components` | React components: Card, ZoneGrid, Roster, Scoreboard, TeamLogo, etc. |
| `/src/engine` | Pure JS game logic: at-bat resolver, season scheduler, AI pitcher |
| `/src/data` | JSON files: `cards.json`, `teams.json`, `eras.json`, `traits.json`, `aiTeams.json` |
| `/src/store` | Zustand stores: `gameStore`, `rosterStore`, `seasonStore`, `collectionStore` |
| `/src/styles` | Global styles, era theme tokens, card frame CSS |
| `/src/assets/cards` | Card art PNGs organized by era (`deadball/`, `golden/`, `hardball/`, `modern/`) |
| `/src/assets/logos` | Team logos — SVG placeholders plus promoted PNG AI outputs per franchise. `TeamLogo` component auto-prefers PNG over SVG. |
| `/src/assets/ui` | Stadium textures, scoreboard graphics, UI chrome |
| `/pipeline` | Node.js ESM scripts for asset generation. `generate_logos.js` reads `teams.json` and outputs one SVG placeholder per franchise. |
| `/comfyui` | Python scripts for ComfyUI REST API: `logo_workflow.py` (active), `portrait_workflow.py` (planned). Scripts, not workflow JSONs. |

---

## 12. Visual Design Direction

The visual identity of Diamond Legends operates on two layers: the Ballpark Layer (the game UI environment) and the Card Layer (the collectible cards themselves).

### 12.1 The Ballpark Layer — UI Environment

The game UI should feel like standing inside a classic ballpark — warm, textured, nostalgic. Not a cartoon, not a flat design system. A place with history.

| Element | Direction |
|---|---|
| **Base Palette** | Deep stadium green (`#1a3a2a`), aged wood brown (`#5c3d1e`), warm amber lighting (`#f0a830`), cream parchment (`#f5f0e8`) |
| **Textures** | Felt/grass grain on large panels, weathered wood planks for sidebars, aged metal rivets on borders |
| **Scoreboard** | Hand-painted block letter typography, slightly uneven — references classic manual scoreboards |
| **Lighting Mood** | Warm amber, not harsh white. Suggests late afternoon stadium light filtering through upper decks |
| **Typography — Display** | Playfair Display or a slab serif (Abril Fatface) — editorial weight, nostalgic authority |
| **Typography — UI** | Clean tabular mono for stats and numbers (Roboto Mono or IBM Plex Mono) |
| **Sound Design (Phase 2)** | Ambient crowd murmur, distant organ, crack of the bat — implied not intrusive |

### 12.2 The Card Layer — Era-Accurate Design

Card background color is driven by team primary color, not era color. Each era has a distinct card layout derived from a specific real-world card reference.

| Era | Card Reference | Visual Details |
|---|---|---|
| **Deadball Era (1900–1919)** | 1915 Cracker Jack | Illustrated portrait, bold team color background, brand name at top. Oval portrait vignette, letterpress serif typography, tobacco/brand watermark aesthetic. Team primary color dominates the card face. |
| **Golden Age (1920–1959)** | 1958 Topps | Photo portrait, team banner at top, player name at bottom, clean white border. Hand-tinted portrait feel, bold team color banner, bright primary palette. |
| **Hardball Era (1960–1989)** | 1986 Topps | Full action photo, black header with team name, white border. Bold color stripe treatment, clean sans-serif stats, team logo corner. |
| **Modern Game (1990–Today)** | 2025 Topps | Full-bleed photo, team name vertical left edge, logo bottom-left, clean silver frame. Holographic foil shimmer on Legend-tier cards. Legends get prismatic rainbow foil treatment. |

### 12.3 Card Detail View — Landscape Expand Overlay

The original GDD specified a flip animation to reveal card back stats. This has been replaced in the build with a landscape expand overlay, which provides the space needed for a full career stats table and tool score bars at readable size.

| Element | Detail |
|---|---|
| **Trigger** | Click any card to open a full-screen dimmed overlay |
| **Layout** | Card expands and rotates into a 900×500px landscape panel |
| **Left Panel** | Era-styled art area with overall rating, rarity badge, team logo, card number |
| **Right Panel** | Player name, bio strip, full season-by-season stats table, five tool progress bars |
| **Dismiss** | X button, click backdrop, or Escape key |
| **Card Back** | Card back components still exist in code but are not the primary detail view |
| **Rationale** | Landscape format gives room for dense stat content at readable size. Flip animation felt cramped. |

### 12.5 At-Bat Screen Layout (Implemented)

The at-bat screen is a three-zone vertical layout: HUD strip at the top, center gameplay area, left/right side panels.

**HUD (two rows):**
- Row 1 — Score: Away team (logo + name + score) left-aligned | Full inning line score right-aligned. Both vertically centered.
- Row 2 — Count (balls/strikes as dots) | separator | Outs (dots) | separator | Inning + half | separator | Base diagram. All elements justified to center.
- HUD accent color pulses amber when player is pitching, blue when batting.

**Side Panels — Fixed Roles:**
- **Left panel = Away team (player)** at all times. Does not swap by inning.
- **Right panel = Home team (AI)** at all times.
- Each panel has a subtle team primary color tint on the background.
- A role banner at the top of each panel shows `● AT BAT` (green) or `⚡ PITCHING` (amber) with the team name. Roles swap each half-inning; panel positions do not.

**Left Panel Contents (batting half):**
- Role banner: `● AT BAT`
- Batter card (md size)
- Stat box: this-game at-bat history, tool bars (AVG / PWR / SPD only — FLD and ARM omitted)
- Power-up token menu (batting tokens)
- On-Deck display: 3-card solitaire pile visual (top card visible, two cards peeking behind), batter name, position, game stat line (e.g. 1-3, 2B)

**Left Panel Contents (pitching half):**
- Role banner: `⚡ PITCHING`
- Player pitcher card (md size)
- Pitch state: zone budget remaining, fatigue bar, pitch type history

**Center Zone Canvas:**
- 9-zone SVG pitch grid showing remaining budget counts per zone (not %)
- Depleted zones show red ✕ with dashed red border; click is blocked
- Pitch history dots with recency fade; last pitch highlighted with glow ring
- Home plate pentagon below zone
- Hover crosshair guide when in guess mode

**Card Resolution (AI):**
- `normalizeAICard` resolves AI roster entries to real card data via 5-level fallback: exact cardId → franchiseId+era+position → era+position (any team) → position-only (any era) → synthetic stub. This ensures real player cards are always shown when available.

### 12.6 VS Screen (Batter-Up Overlay)

Displayed between at-bats. Two cards slide toward the center of the screen from opposite sides using Framer Motion spring animation (`x` transition, `y: -175` to vertically center at `top: 50%`). Cards rest at slight opposing angles (±3°). Background dims to near-black. Pitcher card on the right, batter card on the left. Player/team name displayed below each card.

> **IMPLEMENTATION NOTE:** Framer Motion `x/y/rotate` values must not be combined with CSS `transform` on the same element — they conflict. All positional transforms must be set via Framer Motion motion values only.

### 12.4 Design References

- MLB The Show Diamond Dynasty — card collection UI, pack opening flow, roster builder layout
- Balatro — how a card game can feel tactile, alive, and satisfying in a browser/desktop context
- EA FC / FIFA Ultimate Team — card tier visual language, rarity shimmer treatments
- T206 Tobacco Card set (1909–1911) — the gold standard for Deadball era card authenticity
- 1952 Topps Baseball set — definitive Golden Age card design reference
- 1982–1987 Topps Baseball sets — Hardball era card design reference
- Topps Chrome / Bowman Chrome (2000s) — Modern era foil and chrome treatments

---

## 13. Card Art Pipeline — ComfyUI

### 13.1 Pipeline Overview

ComfyUI runs locally on the Windows dev machine (not a separate Ubuntu server). API host: `127.0.0.1:8188`. A separate network/server setup remains possible in Phase 2 if needed.

| Setting | Detail |
|---|---|
| **ComfyUI Host** | `127.0.0.1:8188` — local Windows machine. No network hop required. |
| **Phase 1 (Active)** | ComfyUI runs locally. Scripts in `/comfyui/` hit the local API directly. Logo pipeline operational. Portrait pipeline planned. |
| **Phase 2 (Optional)** | If ComfyUI moves to a dedicated machine, update API host in pipeline scripts. Architecture supports this without code changes beyond the host URL. |

### 13.2 Logo Generation Pipeline

A two-track logo pipeline provides immediate SVG placeholder coverage for all franchises, with AI-generated PNGs reviewed and promoted on a per-franchise basis.

| Track | Details |
|---|---|
| **Track 1 — SVG Placeholders** | Script: `pipeline/generate_logos.js` (Node.js ESM). Reads `src/data/teams.json`, generates one SVG per franchise with a distinctive geometric shape (I-beam, ship wheel, peach, foghorn, crown, compass rose, anvil, delta triangle, flame, locomotive, arrow, sunburst, mountain peak). Output: `src/assets/logos/[franchiseId].svg` |
| **Track 2 — ComfyUI AI Logos** | Script: `comfyui/logo_workflow.py`. Per-franchise, per-era unique prompts. Era typography: Deadball = Victorian pennant cursive, Golden = 1950s Americana script, Hardball = bold 1980s block, Modern = clean sans-serif. Output: `src/assets/logos/[franchiseId]/raw/[franchiseId]_v001.png` |
| **Promote Approved PNG** | `cp raw/x_v001.png src/assets/logos/x.png` — `TeamLogo` component auto-prefers PNG over SVG once promoted |

CLI usage for `logo_workflow.py`:
```
python comfyui/logo_workflow.py                    # all 13 teams
python comfyui/logo_workflow.py --franchise irons  # single franchise
python comfyui/logo_workflow.py --era deadball     # era filter with era-specific prompt
python comfyui/logo_workflow.py --dry-run          # preview prompts only, no generation
```

### 13.3 Per-Era Portrait Prompt Specifications

Each era has a locked prompt template that ensures visual consistency across all cards in that era.

| Era | Type | Prompt Content |
|---|---|---|
| **Deadball (1900–1919)** | Style | Sepia tone, oval vignette portrait, painterly soft focus, period baseball uniform with high collar, serious expression, studio lighting, aged photographic grain, 1900s baseball player, vintage portrait photography style |
| **Golden Age (1920–1959)** | Style | Hand-tinted color photograph, warm Kodachrome palette, baseball uniform with team colors, confident smile, studio portrait, slightly glossy, 1940s baseball card portrait style, vivid but slightly faded color |
| **Hardball Era (1960–1989)** | Style | Action portrait, athletic pose, bright stadium lighting, sharp color photography, 1970s baseball player, Topps card portrait style, bold colors, slight film grain, dynamic crop |
| **Modern (1990–Today)** | Style | Clean editorial portrait, sharp digital photography, modern baseball uniform, stadium background blur, high contrast, contemporary sports photography, photorealistic, crisp detail |
| **All Eras (Negative)** | Avoid | text, watermark, logo, cartoon, anime, painting, illustration, deformed hands, extra limbs, blurry face, low quality, modern elements in historical eras |

### 13.4 Output Specifications

| Parameter | Specification |
|---|---|
| **Portrait Dimensions** | 512 × 720px (card portrait area only — no frame) |
| **Full Card Dimensions** | 600 × 840px (portrait + card frame composite) |
| **File Format** | PNG with transparency support for frame compositing |
| **Naming Convention** | `[era]_[position]_[id].png` e.g. `deadball_sp_001.png` |
| **Target Volume** | 60 portraits for Phase 1 MVP (15 per era) |
| **ComfyUI Model** | Flux1-dev via UNETLoader (local Windows machine) |

---

## 14. Claude Code Kickoff Prompt

Use the following prompt as your first message when starting a new Claude Code session on this project. The GDD now lives at `docs/gdd.md` in the repo — read it directly rather than relying on this prompt alone.

---

**WHAT I'M BUILDING:**
A browser-based baseball strategy card game called Diamond Legends. React + Vite, runs entirely client-side, no backend. Think FIFA Ultimate Team meets vintage baseball cards meets Strat-O-Matic. The full GDD is at `docs/gdd.md` — read Section 5 (at-bat system) and Section 6 (token economy) carefully before building the game engine.

**CORE GAME CONCEPT:**
Players collect fictional player cards from 4 eras (Deadball 1900–1919, Golden Age 1920–1959, Hardball 1960–1989, Modern 1990–today). Cards have 5 tool scores (Hitting for Average, Hitting for Power, Running Speed, Fielding/Glove, Arm Strength) plus an Era Trait keyword. Players build a 15-man roster (9 starters + 5–6 bench) and play a 30-game PvE season of 3-game series, then a playoff. Fully turn-based — no timing mechanics, no reflexes. Pure strategy.

**TECH STACK:**
React + Vite | Tailwind CSS | Framer Motion | Zustand (gameStore, rosterStore, seasonStore, collectionStore) | JSON flat files for all game data | localStorage for session persistence. No backend, no auth, no database in Phase 1.

**PROJECT STRUCTURE:**
`src/components/` | `src/engine/` (at-bat state machine, AI pitcher logic, season scheduler) | `src/data/` (cards.json, eras.json, traits.json, pitchTypes.json, ballFlightMatrix.json, aiTeams.json) | `src/store/` | `src/styles/` | `src/assets/cards/{deadball,golden,hardball,modern}/` | `src/assets/logos/` | `src/assets/ui/` | `/docs/` | `/comfyui/` | `/pipeline/` | `DECISIONS.md` (running design change log at repo root)

**CURRENT STATE (as of March 2026):**
- Card system: `Card.jsx` (4 era fronts), `CardExpanded.jsx` (landscape overlay 900×500px, portal-based), `TeamLogo.jsx` (PNG-preferred over SVG, Vite 8 glob syntax)
- Teams data: `src/data/teams.json` — 13 franchises complete
- Cards data: `src/data/cards.json` — 8 seed cards (target 60 for Phase 1)
- Logo pipeline: `pipeline/generate_logos.js` (SVG) + `comfyui/logo_workflow.py` (AI PNG) — operational
- **At-bat engine: BUILT** — `src/engine/atBat.js`, `pitchAI.js`, `contactResolver.js`, `ballFlight.js`, `defenseResolver.js`, `tokens.js`
- **Zustand stores: BUILT** — `collectionStore`, `rosterStore`, `seasonStore`
- **At-bat screen: BUILT** — `AtBatScene.jsx`, `AtBatHUD.jsx`, `ZoneCanvas.jsx`, `BatterPanel.jsx`, `PitcherPanel.jsx`, `BatterUpOverlay.jsx`, `UIScene.jsx`
- **Season + roster screens: BUILT** — `SeasonScreen.jsx`, `RosterScreen.jsx`, `CollectionScreen.jsx`, `Nav.jsx`
- **AI opponent: BUILT** — `src/data/aiTeams.json` with 5-level card resolution in `App.jsx`
- Deployed: GitHub Pages at `https://duckdog7.github.io/diamond-legends/`
- Pending Phase 1: expand card pool to 60, hot/cold streak system, full tutorial, token UI pass, "Read" token

---

*⬦ DIAMOND LEGENDS ⬦ — Game Design Document · v1.4 · March 2026*
