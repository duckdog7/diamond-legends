"""
Diamond Legends — Team Logo Generator (ComfyUI)
================================================
Submits logo generation jobs to a running ComfyUI instance over the REST API.
Outputs one PNG per team to:  src/assets/logos/[franchiseId]/raw/[franchiseId]_v001.png

WORKFLOW
--------
1. Review raw PNG output
2. If approved → copy to src/assets/logos/[franchiseId].png
3. Re-run pipeline/generate_logos.js — it skips franchises that have a PNG

SETUP
-----
- ComfyUI must be running locally (default: http://127.0.0.1:8188)
- Edit COMFYUI_HOST below if you move to a network machine later
- Edit CHECKPOINT_NAME to match the model you have installed

RUN
---
  python comfyui/logo_workflow.py                  # all teams
  python comfyui/logo_workflow.py --franchise irons pilgrims  # specific teams
  python comfyui/logo_workflow.py --era deadball   # all teams active in era
  python comfyui/logo_workflow.py --dry-run        # print prompts, no generation
"""

import json
import os
import sys
import time
import random
import argparse
import urllib.request
import urllib.parse
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────────────────

COMFYUI_HOST   = "127.0.0.1:8188"   # local Windows default — update if moved to a network machine

# Flux1-dev model files (as found in c:/projects/ComfyUI/models/)
FLUX_UNET      = "flux1-dev.safetensors"
FLUX_CLIP_L    = "clip_l.safetensors"
FLUX_T5        = "t5xxl_fp8_e4m3fn.safetensors"
FLUX_VAE       = "ae.safetensors"

OUTPUT_SIZE    = 512
STEPS          = 20
GUIDANCE       = 3.5    # Flux guidance scale (replaces CFG)
SAMPLER        = "euler"
SCHEDULER      = "simple"   # Flux prefers "simple" over "normal"

ROOT      = Path(__file__).parent.parent
TEAMS_JSON = ROOT / "src" / "data" / "teams.json"
OUT_BASE   = ROOT / "src" / "assets" / "logos"

# ─── Era-specific prompt templates ───────────────────────────────────────────

NEGATIVE_PROMPT = (
    "photograph, realistic, 3d render, blurry, low quality, "
    "complex background, busy, cluttered, multiple logos, "
    "cartoon character, anime, person, face, hands, "
    "MLB logo, batter silhouette, baseball player silhouette, "
    "official league logo, registered trademark symbol, existing sports logo, "
    "New York, Los Angeles, Chicago, Boston, Atlanta, San Francisco, "
    "Pittsburgh, Detroit, New Orleans, Philadelphia, Cincinnati, Kansas City, Miami, Denver"
)

# ─── Per-franchise per-era logo prompts ───────────────────────────────────────
# Each entry is a complete prompt passed directly to the model.
# Typography guide:
#   deadball  → ornate Victorian / pennant cursive script
#   golden    → retro 1950s flowing Americana script
#   hardball  → bold blocky 1980s sans-serif
#   modern    → clean sharp contemporary sans-serif

TEAM_LOGO_PROMPTS = {

    # ── Chicago Irons — steel and navy, all eras ──────────────────────────────
    "irons": {
        "deadball": (
            "1910s tobacco card style baseball badge, single bold letter I with rivet dots on crossbars, "
            "simple flat two-color design, no gradients, crude letterpress woodblock quality, "
            "steel grey and navy blue, isolated on white background, "
            "word IRONS in plain hand-lettered Victorian block serif below"
        ),
        "golden": (
            "1950s baseball oval badge, stylized I-beam steel girder monogram, "
            "steel grey and navy blue, isolated on white background, flat clean design, "
            "word IRONS in retro 1950s Americana flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, angular geometric I-beam logo mark, industrial theme, "
            "steel grey and navy blue, isolated on white background, flat design, "
            "word IRONS in bold blocky strong 1980s sans-serif lettering"
        ),
        "modern": (
            "modern professional baseball logo, clean I-beam girder monogram mark, "
            "steel grey and navy blue, isolated on white background, minimal flat vector design, "
            "word IRONS in sharp clean contemporary sans-serif lettering"
        ),
    },

    # ── Boston Pilgrims — deep red and cream, all eras ────────────────────────
    "pilgrims": {
        "deadball": (
            "1910s tobacco card style baseball badge, simple tall ship silhouette with three masts, "
            "flat two-color crude letterpress design, no gradients or fine detail, "
            "deep red and cream, isolated on white background, "
            "word PILGRIMS in plain hand-lettered Victorian serif below ship"
        ),
        "golden": (
            "1950s baseball oval badge, ship anchor with rope border, nautical Americana badge, "
            "deep red and cream, isolated on white background, flat clean design, "
            "word PILGRIMS in retro 1950s flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, bold P letter with anchor and chain, nautical sports badge, "
            "deep red and white, isolated on white background, flat design, "
            "word PILGRIMS in bold blocky strong sans-serif lettering"
        ),
        "modern": (
            "modern professional baseball logo, clean ship wheel icon mark, minimal nautical design, "
            "deep red and cream, isolated on white background, minimal flat vector design, "
            "word PILGRIMS in sharp clean modern sans-serif lettering"
        ),
    },

    # ── Atlanta Peaches — forest green and peach, all eras ───────────────────
    "peaches": {
        "deadball": (
            "1910s tobacco card style baseball badge, single large peach fruit with one leaf, "
            "flat crude two-color letterpress print, simple bold outline, no shading or gradients, "
            "forest green and peach orange, isolated on white background, "
            "word PEACHES in plain hand-lettered Victorian serif below"
        ),
        "golden": (
            "1950s baseball oval badge, ripe peach fruit illustration with leaves, Americana style, "
            "forest green and peach orange, isolated on white background, flat clean design, "
            "word PEACHES in retro 1950s Americana flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, bold stylized peach icon with geometric leaf shapes, "
            "forest green and peach orange, isolated on white background, flat design, "
            "word PEACHES in bold blocky 1980s sans-serif lettering"
        ),
        "modern": (
            "modern professional baseball logo, clean minimal peach silhouette mark, "
            "forest green and peach orange, isolated on white background, minimal flat vector design, "
            "word PEACHES in sharp clean modern sans-serif lettering"
        ),
    },

    # ── San Francisco Foghorns — slate blue and silver, all eras ─────────────
    "foghorns": {
        "deadball": (
            "vintage 1910s baseball pennant badge, foghorn instrument silhouette as central mark, "
            "two horizontal fog wave lines beneath horn, simple flat two-color design, "
            "slate blue and cream, isolated on white background, crude letterpress woodblock print quality, "
            "word FOGHORNS in hand-lettered Victorian pennant cursive below"
        ),
        "golden": (
            "1950s baseball diamond-shaped badge, foghorn blasting diagonal fog lines to the right, "
            "slate blue and silver, isolated on white background, flat clean Americana design, "
            "word FOGHORNS in retro 1950s flowing italic script, stacked two lines inside badge"
        ),
        "hardball": (
            "1980s baseball emblem, diagonal foghorn shape with bold wave burst lines radiating right, "
            "silver and slate blue color block design, isolated on white background, flat design, "
            "word FOGHORNS in tall condensed bold sans-serif lettering across bottom"
        ),
        "modern": (
            "modern professional baseball logo, stylized foghorn icon angled at 45 degrees, "
            "three sound wave arcs emanating from bell, slate blue and silver, "
            "isolated on white background, minimal flat vector design, "
            "word FOGHORNS in clean condensed sans-serif lettering below icon"
        ),
    },

    # ── Empire — charcoal and gold (Brooklyn Monuments → New York Empire) ─────
    "empire": {
        "deadball": (
            "vintage 1910s baseball pennant badge, tall stone obelisk monument centered in shield crest, "
            "simple flat two-color design, charcoal and cream, isolated on white background, "
            "crude letterpress woodblock print quality, no city initials, "
            "word MONUMENTS in hand-lettered Victorian pennant cursive script arched below shield"
        ),
        "golden": (
            "1950s baseball pennant oval badge, three stone columns forming a colonnade arch, "
            "charcoal and gold, isolated on white background, flat clean Americana design, "
            "word MONUMENTS in retro 1950s italic script lettering below arch"
        ),
        "hardball": (
            "1980s baseball emblem, bold crown with five pointed spires, "
            "thick charcoal and gold color block banner below crown, "
            "isolated on white background, flat design, "
            "word EMPIRE in tall wide condensed bold sans-serif inside the banner"
        ),
        "modern": (
            "modern professional baseball logo, single bold five-point crown icon, "
            "clean geometric charcoal and gold, isolated on white background, minimal flat vector design, "
            "word EMPIRE in sharp extended modern serif lettering below crown, "
            "completely different from any existing baseball team logo"
        ),
    },

    # ── Rovers — burnt orange and sand (Brooklyn Sentinels → LA Rovers) ───────
    "rovers": {
        "hardball": (
            "1980s baseball emblem, bold shield badge with single sentinel watchtower silhouette, "
            "star above tower, burnt orange and sand, isolated on white background, flat design, "
            "word SENTINELS in bold condensed strong sans-serif lettering across bottom of shield"
        ),
        "modern": (
            "modern professional baseball logo, eight-point compass rose as dominant central mark, "
            "no city initials, burnt orange and sand, isolated on white background, minimal flat vector design, "
            "word ROVERS in wide-tracked clean modern sans-serif lettering below compass, "
            "distinct from any existing baseball team logo"
        ),
    },

    # ── Foundry — steel blue and amber (Pittsburgh → Detroit Foundry) ─────────
    "foundry": {
        "deadball": (
            "1910s tobacco card style baseball badge, single anvil silhouette, flat crude two-color design, "
            "thick bold outline, no gradients, crude letterpress woodblock print quality, "
            "steel blue and amber, isolated on white background, "
            "word FOUNDRY in plain hand-lettered Victorian block serif below anvil"
        ),
        "golden": (
            "1950s baseball oval badge, anvil and hammer industrial crest, Americana badge, "
            "steel blue and amber, isolated on white background, flat clean design, "
            "word FOUNDRY in retro 1950s Americana flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, bold letter D with gear wheel integrated, Detroit industrial theme, "
            "steel blue and amber, isolated on white background, flat design, "
            "word FOUNDRY in bold blocky strong sans-serif lettering"
        ),
        "modern": (
            "modern professional baseball logo, clean anvil silhouette mark, minimal industrial design, "
            "steel blue and amber, isolated on white background, minimal flat vector design, "
            "word FOUNDRY in sharp clean modern sans-serif lettering"
        ),
    },

    # ── Deltas — forest green and gold (Baltimore Tides → New Orleans Deltas) ─
    "deltas": {
        "deadball": (
            "1910s tobacco card style baseball badge, single crab silhouette, Baltimore Tides, "
            "flat crude two-color letterpress design, bold thick outline, no gradients, "
            "forest green and gold, isolated on white background, "
            "word TIDES in plain hand-lettered Victorian block serif below crab"
        ),
        "golden": (
            "1950s baseball oval badge, river delta triangle with rippling water motif, New Orleans badge, "
            "forest green and gold, isolated on white background, flat clean design, "
            "word DELTAS in retro 1950s Americana flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, bold upward delta triangle arrow with river wave bar below, "
            "forest green and gold, isolated on white background, flat design, "
            "word DELTAS in bold blocky strong sans-serif lettering"
        ),
        "modern": (
            "modern professional baseball logo, clean delta triangle mark with water line accent, "
            "forest green and gold, isolated on white background, minimal flat vector design, "
            "word DELTAS in sharp clean modern sans-serif lettering"
        ),
    },

    # ── Philadelphia Cinders — burgundy and grey, deadball + golden only ──────
    "cinders": {
        "deadball": (
            "1910s tobacco card style baseball badge, single bold flame shape, "
            "flat crude two-color letterpress design, thick outline, no gradients, "
            "burgundy and grey, isolated on white background, "
            "word CINDERS in plain hand-lettered Victorian block serif below flame"
        ),
        "golden": (
            "1950s baseball oval badge, stylized flame motif with ember spark accents, Americana badge, "
            "burgundy and grey, isolated on white background, flat clean design, "
            "word CINDERS in retro 1950s Americana flowing script lettering"
        ),
    },

    # ── Cincinnati Engines — red and black, deadball only ─────────────────────
    "engines": {
        "deadball": (
            "1910s tobacco card style baseball badge, side view steam locomotive silhouette, "
            "flat crude two-color design, bold thick outline, no gradients or fine detail, "
            "red and black, isolated on white background, "
            "word ENGINES in plain hand-lettered Victorian block serif below locomotive"
        ),
    },

    # ── Kansas City Ramblers — royal blue and red, golden + hardball only ─────
    "ramblers": {
        "golden": (
            "1950s baseball oval badge, open highway road vanishing to horizon with KC monogram, "
            "royal blue and red, isolated on white background, flat clean design, "
            "word RAMBLERS in retro 1950s Americana flowing script lettering"
        ),
        "hardball": (
            "1980s baseball emblem, bold KC block letters with diagonal speed motion lines, road theme, "
            "royal blue and red, isolated on white background, flat design, "
            "word RAMBLERS in bold blocky strong 1980s sans-serif lettering"
        ),
    },

    # ── Miami Glare — teal and coral, modern only ─────────────────────────────
    "glare": {
        "modern": (
            "modern professional baseball logo, heat haze shimmer lines rising upward, "
            "stylized sun half-circle at base with wavy heat distortion bars above, "
            "teal and coral, isolated on white background, minimal flat vector design, "
            "word GLARE in bold italic leaning sans-serif lettering, "
            "distinct from any existing baseball or sports team logo"
        ),
    },

    # ── Denver Ascent — purple and silver, modern only ────────────────────────
    "ascent": {
        "modern": (
            "modern professional baseball logo, mountain peak silhouette mark, minimal alpine design, "
            "purple and silver, isolated on white background, minimal flat vector design, "
            "word ASCENT in sharp clean contemporary sans-serif lettering"
        ),
    },
}

# ─── ComfyUI API ─────────────────────────────────────────────────────────────

def api(endpoint, data=None):
    url = f"http://{COMFYUI_HOST}/{endpoint}"
    if data:
        payload = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    else:
        req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def queue_prompt(workflow):
    result = api("prompt", {"prompt": workflow})
    return result["prompt_id"]


def poll_until_done(prompt_id, timeout=300):
    deadline = time.time() + timeout
    while time.time() < deadline:
        history = api(f"history/{prompt_id}")
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
    raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout}s")


def download_image(filename, subfolder="", folder_type="output"):
    params = urllib.parse.urlencode({
        "filename": filename,
        "subfolder": subfolder,
        "type": folder_type,
    })
    url = f"http://{COMFYUI_HOST}/view?{params}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read()

# ─── Workflow builder ─────────────────────────────────────────────────────────

def build_workflow(positive_prompt, negative_prompt, seed, filename_prefix):
    """
    Flux1-dev workflow using separate UNET / DualCLIP / VAE loaders.
    Flux does not use a traditional negative prompt — it is left empty.
    Guidance is applied via the FluxGuidance node rather than CFG.
    """
    return {
        # Model loaders
        "unet": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": FLUX_UNET, "weight_dtype": "default"},
        },
        "clip": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": FLUX_CLIP_L,
                "clip_name2": FLUX_T5,
                "type": "flux",
            },
        },
        "vae": {
            "class_type": "VAELoader",
            "inputs": {"vae_name": FLUX_VAE},
        },
        # Text encoding — Flux ignores negative, pass empty string
        "positive": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["clip", 0], "text": positive_prompt},
        },
        "negative": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["clip", 0], "text": ""},
        },
        # Flux guidance scale node
        "guidance": {
            "class_type": "FluxGuidance",
            "inputs": {"conditioning": ["positive", 0], "guidance": GUIDANCE},
        },
        # Latent image — use EmptySD3LatentImage for Flux
        "latent": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": OUTPUT_SIZE, "height": OUTPUT_SIZE, "batch_size": 1},
        },
        # Sampler
        "sampler": {
            "class_type": "KSampler",
            "inputs": {
                "model":        ["unet", 0],
                "positive":     ["guidance", 0],
                "negative":     ["negative", 0],
                "latent_image": ["latent", 0],
                "seed":         seed,
                "steps":        STEPS,
                "cfg":          1.0,        # unused by Flux but required by node
                "sampler_name": SAMPLER,
                "scheduler":    SCHEDULER,
                "denoise":      1.0,
            },
        },
        # Decode + save
        "decode": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["sampler", 0], "vae": ["vae", 0]},
        },
        "save": {
            "class_type": "SaveImage",
            "inputs": {"images": ["decode", 0], "filename_prefix": filename_prefix},
        },
    }

# ─── Era resolution ──────────────────────────────────────────────────────────

def get_primary_era(franchise):
    """Return the era with the most history entries, or the last one."""
    return franchise["history"][-1]["eras"][-1]


def build_prompt(franchise_id, era):
    era_prompts = TEAM_LOGO_PROMPTS.get(franchise_id, {})
    # Exact era match → fallback to modern → fallback to first defined era
    prompt = era_prompts.get(era) or era_prompts.get("modern")
    if not prompt and era_prompts:
        prompt = next(iter(era_prompts.values()))
    if not prompt:
        prompt = f"vintage baseball team logo, {franchise_id}, isolated on white background, flat vector art"
    return prompt

# ─── Main ─────────────────────────────────────────────────────────────────────

def generate(franchise, era_override=None, dry_run=False):
    fid  = franchise["franchiseId"]
    era  = era_override or get_primary_era(franchise)
    pos  = build_prompt(fid, era)
    seed = random.randint(0, 2**32 - 1)

    out_dir = OUT_BASE / fid / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Version number — find next available
    existing = list(out_dir.glob(f"{fid}_v*.png"))
    version  = len(existing) + 1
    prefix   = f"dl_logo_{fid}_v{version:03d}"

    print(f"\n  {'[DRY RUN] ' if dry_run else ''}Generating: {fid} (era: {era})")
    print(f"  Prompt: {pos[:100]}...")
    print(f"  Output: {out_dir / (prefix + '.png')}")

    if dry_run:
        return

    workflow = build_workflow(pos, NEGATIVE_PROMPT, seed, prefix)

    try:
        prompt_id = queue_prompt(workflow)
        print(f"  Queued: {prompt_id}")
        result = poll_until_done(prompt_id)

        # Find the saved image in the result
        for node_id, node_output in result.get("outputs", {}).items():
            for img in node_output.get("images", []):
                img_data = download_image(img["filename"], img.get("subfolder", ""), img["type"])
                out_path = out_dir / f"{prefix}.png"
                out_path.write_bytes(img_data)
                print(f"  ✓ Saved: {out_path.relative_to(ROOT)}")

    except Exception as e:
        print(f"  ✗ Failed: {e}")


def main():
    global COMFYUI_HOST
    parser = argparse.ArgumentParser(description="Generate Diamond Legends team logos via ComfyUI")
    parser.add_argument("--franchise", nargs="+", help="Specific franchise IDs to generate")
    parser.add_argument("--era",       help="Generate all teams active in this era (deadball/golden/hardball/modern)")
    parser.add_argument("--dry-run",   action="store_true", help="Print prompts without generating")
    parser.add_argument("--host",      default=COMFYUI_HOST, help=f"ComfyUI host (default: {COMFYUI_HOST})")
    args = parser.parse_args()

    COMFYUI_HOST = args.host

    teams = json.loads(TEAMS_JSON.read_text())

    # Filter
    if args.franchise:
        teams = [t for t in teams if t["franchiseId"] in args.franchise]
    elif args.era:
        teams = [t for t in teams if args.era in t["eras"]]

    if not teams:
        print("No matching teams found.")
        sys.exit(1)

    print(f"Diamond Legends Logo Generator")
    print(f"ComfyUI host : {COMFYUI_HOST}")
    print(f"Model        : {FLUX_UNET}")
    print(f"Teams        : {len(teams)}")
    print(f"Output size  : {OUTPUT_SIZE}x{OUTPUT_SIZE}")

    if not args.dry_run:
        # Quick connectivity check
        try:
            api("system_stats")
            print(f"Status       : Connected ✓")
        except Exception as e:
            print(f"\n✗ Cannot reach ComfyUI at {COMFYUI_HOST}: {e}")
            print("  Make sure ComfyUI is running and the host/port is correct.")
            sys.exit(1)

    for franchise in teams:
        generate(franchise, era_override=args.era, dry_run=args.dry_run)

    print(f"\nDone. Review raw output in src/assets/logos/[franchise]/raw/")
    print("To promote an approved logo:")
    print("  cp src/assets/logos/[franchise]/raw/[franchise]_v001.png src/assets/logos/[franchise].png")
    print("Then re-run: node pipeline/generate_logos.js  (SVG will be skipped)")


if __name__ == "__main__":
    main()
