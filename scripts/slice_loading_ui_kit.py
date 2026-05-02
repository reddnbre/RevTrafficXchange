#!/usr/bin/env python3
"""
Slice loading-ui-kit.png into separate PNGs using Pillow.

Bounding boxes are normalized to a 0–1000 coordinate system (left, top, right, bottom)
matching the UI kit layout; they scale to the actual image width/height.

Usage:
  pip install Pillow
  python scripts/slice_loading_ui_kit.py
  python scripts/slice_loading_ui_kit.py -i path/to/kit.png -o assets/loading
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Missing Pillow. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

# (name, (left, top, right, bottom)) in 0–1000 normalized space
REGIONS: list[tuple[str, tuple[int, int, int, int]]] = [
    ("main-frame", (5, 55, 350, 490)),
    ("progress-bar-container", (360, 90, 670, 175)),
    ("progress-bar-empty", (360, 275, 670, 340)),
    ("progress-bar-fill", (360, 420, 670, 470)),
    ("left-panel", (680, 55, 825, 555)),
    ("right-panel", (840, 55, 985, 555)),
    ("bottom-tip-panel", (20, 555, 340, 710)),
    ("logo-rx", (390, 540, 620, 740)),
    ("hyper-mode-badge", (740, 640, 900, 720)),
    ("icon-set-orange", (30, 790, 265, 845)),
    ("icon-set-blue", (30, 910, 265, 965)),
    ("glow-overlay", (290, 805, 560, 985)),
    ("loading-streaks", (570, 805, 770, 985)),
    ("particle-overlay", (780, 805, 985, 985)),
]


def scale_box(
    box: tuple[int, int, int, int], width: int, height: int
) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    l = max(0, int(round(left * width / 1000)))
    t = max(0, int(round(top * height / 1000)))
    r = min(width, int(round(right * width / 1000)))
    b = min(height, int(round(bottom * height / 1000)))
    if r <= l or b <= t:
        raise ValueError(f"Invalid crop after scale: raw={box} -> ({l}, {t}, {r}, {b}) for image {width}x{height}")
    return (l, t, r, b)


def load_rgba(path: Path) -> Image.Image:
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        return im.convert("RGBA")
    return im.convert("RGBA")


def main() -> int:
    parser = argparse.ArgumentParser(description="Slice loading UI kit into PNG assets.")
    parser.add_argument(
        "-i",
        "--input",
        default="loading-ui-kit.png",
        help="Path to loading-ui-kit.png (default: loading-ui-kit.png next to cwd)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="assets/loading",
        help="Output folder for PNG slices (default: assets/loading)",
    )
    args = parser.parse_args()

    root = Path.cwd()
    src = Path(args.input)
    if not src.is_file():
        print(f"Input not found: {src.resolve()}", file=sys.stderr)
        return 1

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    im = load_rgba(src)
    w, h = im.size
    print(f"Loaded {src}  size={w}x{h}  mode={im.mode}")

    for name, box in REGIONS:
        crop_box = scale_box(box, w, h)
        region = im.crop(crop_box)
        dest = out_dir / f"{name}.png"
        region.save(dest, "PNG", optimize=True)
        print(f"  {dest}  crop={crop_box}  size={region.size[0]}x{region.size[1]}")

    print(f"Done: {len(REGIONS)} files in {out_dir.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
