"""
Diamond Legends — Portrait Generator
=====================================
Generates era-styled player portraits via ComfyUI (Flux1-dev + realism LoRA).

Usage
-----
  python pipeline/portrait_workflow.py                     # all cards missing portraits
  python pipeline/portrait_workflow.py --era deadball      # one era
  python pipeline/portrait_workflow.py --card deadball_sp_legend
  python pipeline/portrait_workflow.py --all               # force-regenerate all

Output
------
  src/assets/portraits/{card_id}.png   (768 × 1024, portrait crop)

Requirements
------------
  pip install requests pillow websocket-client
  ComfyUI running at localhost:8188
"""

import argparse
import io
import json
import random
import struct
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path

# ── Third-party (checked at runtime) ──────────────────────────────────────────
try:
    import requests
    from PIL import Image
    import websocket
except ImportError:
    print("Missing deps -- run:  pip install requests pillow websocket-client rembg")
    sys.exit(1)

try:
    import os, sys
    # Suppress onnxruntime CUDA provider warning (falls back to CPU cleanly)
    os.environ["ORT_DISABLE_ALL_LOGS"] = "1"
    os.environ["ONNXRUNTIME_PROVIDERS"] = "CPUExecutionProvider"
    _stderr, sys.stderr = sys.stderr, open(os.devnull, "w")
    from rembg import remove as rembg_remove, new_session as _rembg_new_session
    _rembg_session = _rembg_new_session("u2net")  # pre-load once, reuse per card
    sys.stderr = _stderr
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("Warning: rembg not installed -- background removal disabled. Run: pip install rembg[cpu]")

# ─── Paths ────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent
CARDS_FILE   = ROOT / "src/data/cards.json"
TEAMS_FILE   = ROOT / "src/data/teams.json"
OUT_DIR      = ROOT / "public/portraits"
COMFY_URL    = "http://127.0.0.1:8188"
COMFY_WS_URL = "ws://127.0.0.1:8188/ws"

# ─── Models ───────────────────────────────────────────────────────────────────
MODEL_UNET   = "flux1-dev.safetensors"
MODEL_CLIP1  = "clip_l.safetensors"
MODEL_CLIP2  = "t5xxl_fp8_e4m3fn.safetensors"
MODEL_VAE    = "ae.safetensors"
MODEL_LORA   = "realism_lora_comfy_converted.safetensors"
LORA_STRENGTH = 0.55   # adjust for stylization vs. realism balance

# Portrait dimensions (card face area, 3:4 portrait ratio)
IMG_W = 768
IMG_H = 1024

# ─── Era prompt templates ─────────────────────────────────────────────────────

POSITION_NAMES = {
    "SP": "baseball pitcher", "RP": "baseball relief pitcher",
    "C":  "baseball catcher", "1B": "first baseman",
    "2B": "second baseman",   "3B": "third baseman",
    "SS": "shortstop",        "LF": "left fielder",
    "CF": "center fielder",   "RF": "right fielder",
    "DH": "designated hitter",
}

ERA_STYLE = {
    "deadball": {
        "medium":    "1915 Cracker Jack baseball card illustration, hand-painted portrait",
        "lighting":  "flat even lighting, no cast shadows, clean illustration light",
        "palette":   "warm muted illustration colors, slightly faded, natural skin tones",
        "clothing":  "old-fashioned wool baseball uniform, high collar, small round cap",
        "mood":      "confident relaxed pose, hands on hips or arms at sides, three-quarter body view, direct gaze",
        "quality":   "isolated figure on pure white background, no background scenery, no landscape, painterly brush strokes, vintage sports illustration style, full upper body visible",
    },
    "golden": {
        "medium":    "1940s illustrated baseball trading card",
        "lighting":  "warm golden hour light, clean shadow",
        "palette":   "rich saturated colors, classic Americana tones",
        "clothing":  "classic wool flannel baseball uniform, stirrups visible",
        "mood":      "confident proud smile, heroic three-quarter pose",
        "quality":   "bold clean illustration, golden age sports art style",
    },
    "hardball": {
        "medium":    "1970s gritty sports photograph",
        "lighting":  "high-contrast tungsten stadium lighting",
        "palette":   "saturated 1970s color film, slightly faded",
        "clothing":  "polyester double-knit baseball uniform, batting helmet",
        "mood":      "intense focused expression, action-ready stance",
        "quality":   "grain of 35mm Kodachrome film, authentic 1970s sports photography",
    },
    "modern": {
        "medium":    "modern professional sports photograph",
        "lighting":  "clean studio rim lighting, subtle background bokeh",
        "palette":   "sharp vibrant colors, high dynamic range",
        "clothing":  "modern athletic baseball jersey and cap",
        "mood":      "determined athletic expression, powerful confident pose",
        "quality":   "sharp crisp photography, professional MLB portrait quality",
    },
}

def hex_to_color_name(hex_color: str) -> str:
    """Approximate a hex color string to a natural-language color name."""
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return "dark"
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    mx = max(r, g, b)
    mn = min(r, g, b)
    brightness = (r * 299 + g * 587 + b * 114) / 1000

    if brightness < 40:
        return "black"
    if brightness > 220 and (mx - mn) < 30:
        return "white"
    if mx - mn < 25:
        if brightness < 100:
            return "charcoal"
        if brightness < 170:
            return "gray"
        return "light gray"

    # Hue-based
    if r > g and r > b:
        if g > b * 1.3:
            return "orange" if g > 100 else "red-orange"
        return "dark red" if brightness < 80 else "red"
    if g > r and g > b:
        return "dark green" if brightness < 80 else "green"
    if b > r and b > g:
        if b > 150 and r > 80:
            return "purple"
        return "navy" if brightness < 80 else "blue"
    if r > b * 1.2 and g > b * 1.2:
        return "gold" if brightness > 160 else "dark yellow"
    if r > g * 1.2 and b > g * 1.2:
        return "magenta"
    return "dark"


# ─── Per-card pose overrides ─────────────────────────────────────────────────
# Replaces the era default `mood` with an action-specific description.
CARD_POSE_OVERRIDES = {
    "deadball_sp_001":  "dramatic pitching windup, arm raised high overhead, powerful throwing motion, mid-delivery, full upper body visible",
    "deadball_1b_001":  "batting stance, both hands gripping the bat, weight loaded on back foot, bat raised ready to swing, determined expression",
    "deadball_2b_001":  "low fielding crouch, glove hand extended toward ground, ready to scoop a ground ball, athletic defensive stance",
    "deadball_rf_001":  "strong throwing motion, arm cocked back behind head, weight on back foot about to release, outfielder throw",
    "deadball_1b_002":  "powerful mid-swing follow-through, bat extended full arc, body rotated, hips open, batter has just made contact",
}


def build_prompt(card: dict, team: dict) -> str:
    """Build era-appropriate positive prompt for a player portrait."""
    era    = card.get("era", "modern")
    pos    = card.get("position", "SP")
    style  = ERA_STYLE.get(era, ERA_STYLE["modern"])

    pos_label = POSITION_NAMES.get(pos, "baseball player")

    # Team colors
    primary_color   = hex_to_color_name(team.get("primary",   "#1a1a2e"))
    secondary_color = hex_to_color_name(team.get("secondary", "#ffffff"))
    uniform_desc    = f"{primary_color} and {secondary_color} {style['clothing']}"

    # Rarity accent
    rarity = card.get("rarity", "common")
    rarity_note = {
        "legend":   "legendary iconic presence, hall-of-fame aura, ",
        "rare":     "standout elite athlete, ",
        "uncommon": "skilled professional athlete, ",
        "common":   "",
    }.get(rarity, "")

    # Use card-specific action pose if defined, otherwise era default
    mood = CARD_POSE_OVERRIDES.get(card.get("id", ""), style["mood"])

    prompt = (
        f"{style['medium']}, portrait of a {pos_label}, "
        f"{rarity_note}"
        f"wearing {uniform_desc}, "
        f"{mood}, "
        f"{style['lighting']}, "
        f"{style['palette']}, "
        f"{style['quality']}, "
        f"close-up bust portrait, no text, no watermark, no team logos visible, "
        f"single subject, plain background"
    )
    return prompt


NEGATIVE_PROMPT = (
    "text, watermark, logo, signature, blurry, deformed, ugly, extra limbs, "
    "disfigured, mutation, bad anatomy, duplicate, multiple people, "
    "background scenery, gradient background, colored background, gray background, "
    "stadium, field, sky, clouds, shadows on background, vignette, dark edges"
)

# ─── ComfyUI workflow builder ─────────────────────────────────────────────────

def build_workflow(positive: str, negative: str, seed: int, lora_strength: float = LORA_STRENGTH) -> dict:
    """
    Flux1-dev workflow:
      1  UNETLoader
      2  DualCLIPLoader
      3  VAELoader
      4  LoraLoader       (wraps model + clip)
      5  CLIPTextEncodeFlux (positive)
      6  CLIPTextEncodeFlux (negative — empty works for Flux)
      7  FluxGuidance
      8  EmptyLatentImage
      9  KSampler
      10 VAEDecode
      11 SaveImageWebsocket
    """
    return {
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": MODEL_UNET,
                "weight_dtype": "default",
            },
        },
        "2": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": MODEL_CLIP1,
                "clip_name2": MODEL_CLIP2,
                "type": "flux",
            },
        },
        "3": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": MODEL_VAE,
            },
        },
        "4": {
            "class_type": "LoraLoader",
            "inputs": {
                "lora_name":       MODEL_LORA,
                "strength_model":  lora_strength,
                "strength_clip":   lora_strength,
                "model": ["1", 0],
                "clip":  ["2", 0],
            },
        },
        "5": {
            "class_type": "CLIPTextEncodeFlux",
            "inputs": {
                "clip_l":  positive,
                "t5xxl":   positive,
                "guidance": 3.5,
                "clip": ["4", 1],
            },
        },
        "6": {
            "class_type": "CLIPTextEncodeFlux",
            "inputs": {
                "clip_l":  negative,
                "t5xxl":   negative,
                "guidance": 1.0,
                "clip": ["4", 1],
            },
        },
        "7": {
            "class_type": "FluxGuidance",
            "inputs": {
                "guidance":    3.5,
                "conditioning": ["5", 0],
            },
        },
        "8": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width":       IMG_W,
                "height":      IMG_H,
                "batch_size":  1,
            },
        },
        "9": {
            "class_type": "KSampler",
            "inputs": {
                "seed":         seed,
                "steps":        20,
                "cfg":          1.0,
                "sampler_name": "euler",
                "scheduler":    "simple",
                "denoise":      1.0,
                "model":    ["4", 0],
                "positive": ["7", 0],
                "negative": ["6", 0],
                "latent_image": ["8", 0],
            },
        },
        "10": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["9", 0],
                "vae":     ["3", 0],
            },
        },
        "11": {
            "class_type": "SaveImageWebsocket",
            "inputs": {
                "images": ["10", 0],
            },
        },
    }


# ─── ComfyUI client ───────────────────────────────────────────────────────────

def queue_prompt(workflow: dict, client_id: str) -> str:
    """POST workflow to ComfyUI and return prompt_id."""
    payload = json.dumps({"prompt": workflow, "client_id": client_id}).encode()
    resp = requests.post(f"{COMFY_URL}/prompt", data=payload,
                         headers={"Content-Type": "application/json"})
    resp.raise_for_status()
    return resp.json()["prompt_id"]


def receive_portrait(ws, prompt_id: str) -> bytes:
    """
    Wait on the WebSocket for the image belonging to prompt_id.
    ComfyUI sends:  JSON execution_start / executing / executed messages,
                    then a binary frame: 4-byte type (1=preview,2=output) +
                    4-byte format (PNG=1) + raw PNG bytes.
    Returns raw PNG bytes.
    """
    while True:
        raw = ws.recv()

        if isinstance(raw, bytes):
            # Binary frame — strip 8-byte header, rest is PNG
            if len(raw) > 8:
                event_type = struct.unpack(">I", raw[:4])[0]
                if event_type in (1, 2):          # preview or final image
                    return raw[8:]

        elif isinstance(raw, str):
            msg = json.loads(raw)
            mtype = msg.get("type", "")

            if mtype == "executing":
                node = msg.get("data", {}).get("node")
                if node is None:
                    # execution_complete with no more nodes — shouldn't happen
                    # before we get the binary, but handle gracefully
                    pass

            elif mtype == "execution_error":
                err = msg.get("data", {})
                raise RuntimeError(f"ComfyUI execution error: {err}")


def _clean_alpha_fringe(img_rgba: Image.Image, erode_px: int = 3) -> Image.Image:
    """
    Erode the alpha channel slightly to remove white fringe pixels left by rembg.
    Also hard-clips any alpha below a threshold so near-transparent white pixels
    become fully transparent.
    """
    from PIL import ImageFilter
    import numpy as np

    r, g, b, a = img_rgba.split()

    # Erode: repeated MinFilter shrinks the mask inward
    for _ in range(erode_px):
        a = a.filter(ImageFilter.MinFilter(3))

    # Hard-clip: any pixel with alpha < 30 becomes 0 (kills wispy fringe)
    a_arr = np.array(a)
    a_arr[a_arr < 30] = 0
    a = Image.fromarray(a_arr)

    return Image.merge("RGBA", (r, g, b, a))


def generate_portrait(card: dict, team: dict, out_path: Path, seed: int | None = None) -> None:
    """Run one card through the pipeline and save the portrait PNG."""
    seed = seed if seed is not None else random.randint(0, 2**32 - 1)

    positive = build_prompt(card, team)
    print(f"  prompt: {positive[:120]}...")

    # Illustrated eras use lower LoRA strength so realism doesn't fight the painterly look
    era = card.get("era", "modern")
    lora_strength = 0.25 if era in ("deadball", "golden") else LORA_STRENGTH
    workflow = build_workflow(positive, NEGATIVE_PROMPT, seed, lora_strength=lora_strength)

    import uuid
    client_id = str(uuid.uuid4())

    ws = websocket.WebSocket()
    ws.connect(f"{COMFY_WS_URL}?clientId={client_id}")
    try:
        prompt_id = queue_prompt(workflow, client_id)
        print(f"  queued  prompt_id={prompt_id[:8]}...")
        png_bytes = receive_portrait(ws, prompt_id)
    finally:
        ws.close()

    # Save — strip background for illustrated eras so the player composites cleanly
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(io.BytesIO(png_bytes))
    era = card.get("era", "modern")
    if era in ("deadball", "golden") and REMBG_AVAILABLE:
        print("  removing background...")
        img = rembg_remove(img, session=_rembg_session)
        img = _clean_alpha_fringe(img, erode_px=4)
    img.save(out_path, "PNG")
    print(f"  saved   {out_path.relative_to(ROOT)}")


# ─── Team lookup ──────────────────────────────────────────────────────────────

def load_team_map() -> dict:
    """Returns { (franchiseId, era): { primary, secondary, city, name } }"""
    teams = json.loads(TEAMS_FILE.read_text())
    out = {}
    for franchise in teams:
        fid = franchise["franchiseId"]
        for entry in franchise.get("history", []):
            for era in entry.get("eras", []):
                out[(fid, era)] = {
                    "primary":   entry.get("primary",   "#1a1a2e"),
                    "secondary": entry.get("secondary", "#ffffff"),
                    "city":      entry.get("city",      ""),
                    "name":      entry.get("name",      ""),
                }
    return out


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate Diamond Legends player portraits")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--all",    action="store_true", help="Regenerate all cards")
    group.add_argument("--era",    choices=["deadball", "golden", "hardball", "modern"])
    group.add_argument("--card",   nargs="+", metavar="ID", help="One or more card IDs")
    parser.add_argument("--seed",  type=int, default=None, help="Fixed seed (single card only)")
    args = parser.parse_args()

    # Load data
    all_cards = json.loads(CARDS_FILE.read_text())
    team_map  = load_team_map()

    # Filter cards
    if args.card:
        ids = set(args.card)
        cards = [c for c in all_cards if c["id"] in ids]
        missing = ids - {c["id"] for c in cards}
        if missing:
            print(f"Cards not found: {', '.join(sorted(missing))}")
            sys.exit(1)
    elif args.era:
        cards = [c for c in all_cards if c["era"] == args.era]
    elif args.all:
        cards = all_cards
    else:
        # Default: only cards without a portrait yet
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        existing = {p.stem for p in OUT_DIR.glob("*.png")}
        cards = [c for c in all_cards if c["id"] not in existing]

    if not cards:
        print("Nothing to generate — all portraits already exist. Use --all to force.")
        return

    print(f"\nGenerating {len(cards)} portrait(s)…\n")

    errors = []
    for i, card in enumerate(cards, 1):
        card_id  = card["id"]
        out_path = OUT_DIR / f"{card_id}.png"
        team_key = (card["franchiseId"], card["era"])
        team     = team_map.get(team_key, {"primary": "#1a1a2e", "secondary": "#ffffff"})

        print(f"[{i}/{len(cards)}] {card_id}  ({card['era']} {card['position']} {card['rarity']})")
        try:
            generate_portrait(card, team, out_path, seed=args.seed if args.card else None)
        except Exception as e:
            print(f"  ERROR: {e}")
            errors.append((card_id, str(e)))
        print()

    # Summary
    done = len(cards) - len(errors)
    print(f"Done -- {done}/{len(cards)} portraits generated -> {OUT_DIR.relative_to(ROOT)}")
    if errors:
        print("Errors:")
        for card_id, msg in errors:
            print(f"  {card_id}: {msg}")


if __name__ == "__main__":
    main()
