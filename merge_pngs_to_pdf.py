#!/usr/bin/env python3
"""Merge page PNGs into a cropped multi-page PDF.

Files named like page_0002_a.png and page_0002_b.png are cropped to the
visible scanned page area, so black/empty scanner background is removed.
Files without an a/b suffix are included uncropped.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageChops


PAGE_RE = re.compile(r"^page_(\d+)(?:_([ab]))?\.png$", re.IGNORECASE)
SUFFIX_ORDER = {"": 0, "a": 1, "b": 2}
DEFAULT_MARGIN = 12


def page_sort_key(path: Path) -> tuple[int, int, str]:
    match = PAGE_RE.match(path.name.strip())
    if not match:
        raise ValueError(f"Unexpected PNG filename: {path.name!r}")

    page_number = int(match.group(1))
    suffix = (match.group(2) or "").lower()
    return page_number, SUFFIX_ORDER[suffix], path.name


def png_pages(input_dir: Path) -> list[Path]:
    pages = []
    skipped = []

    for path in input_dir.iterdir():
        if path.is_file() and path.suffix.lower() == ".png":
            if PAGE_RE.match(path.name.strip()):
                pages.append(path)
            else:
                skipped.append(path.name)

    if skipped:
        names = ", ".join(sorted(skipped))
        raise ValueError(f"Found PNG files that do not match page_####[_a|_b].png: {names}")

    if not pages:
        raise ValueError(f"No matching PNG files found in {input_dir}")

    return sorted(pages, key=page_sort_key)


def non_black_bbox(image: Image.Image, threshold: int = 35) -> tuple[int, int, int, int] | None:
    """Return the bounding box of pixels that are not scanner-black background."""
    grayscale = image.convert("L")
    mask = grayscale.point(lambda value: 255 if value > threshold else 0, mode="1")
    return mask.getbbox()


def non_white_bbox(image: Image.Image, threshold: int = 245) -> tuple[int, int, int, int] | None:
    """Return the bounding box of pixels that are not near-white."""
    rgb = image.convert("RGB")
    white = Image.new("RGB", rgb.size, "white")
    diff = ImageChops.difference(rgb, white).convert("L")
    mask = diff.point(lambda value: 255 if value > (255 - threshold) else 0, mode="1")
    return mask.getbbox()


def add_margin(
    bbox: tuple[int, int, int, int],
    image_size: tuple[int, int],
    margin: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    width, height = image_size
    return (
        max(0, left - margin),
        max(0, top - margin),
        min(width, right + margin),
        min(height, bottom + margin),
    )


def crop_page(
    image: Image.Image,
    suffix: str,
    crop_mode: str,
    margin: int,
) -> Image.Image:
    width, height = image.size

    if crop_mode == "half":
        midpoint = width // 2
        if suffix == "a":
            return image.crop((0, 0, midpoint, height))
        if suffix == "b":
            return image.crop((midpoint, 0, width, height))
        return image.copy()

    if crop_mode == "content":
        bbox = non_black_bbox(image)
        if bbox:
            left, top, right, bottom = bbox
            nearly_full_width = (right - left) > width * 0.95
            nearly_full_height = (bottom - top) > height * 0.95
            if nearly_full_width and nearly_full_height:
                bbox = non_white_bbox(image) or bbox
        else:
            bbox = non_white_bbox(image)

        if bbox:
            return image.crop(add_margin(bbox, image.size, margin))

    return image.copy()


def prepare_pdf_page(path: Path, crop_mode: str, margin: int) -> Image.Image:
    match = PAGE_RE.match(path.name.strip())
    if not match:
        raise ValueError(f"Unexpected PNG filename: {path.name!r}")

    suffix = (match.group(2) or "").lower()
    with Image.open(path) as image:
        cropped = crop_page(image, suffix, crop_mode, margin)

        if cropped.mode == "RGBA":
            background = Image.new("RGB", cropped.size, "white")
            background.paste(cropped, mask=cropped.getchannel("A"))
            return background

        return cropped.convert("RGB")


def merge_pngs_to_pdf(
    input_dir: Path,
    output_pdf: Path,
    crop_mode: str,
    margin: int,
) -> None:
    paths = png_pages(input_dir)
    pages = [prepare_pdf_page(path, crop_mode, margin) for path in paths]

    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    first_page, remaining_pages = pages[0], pages[1:]
    first_page.save(
        output_pdf,
        "PDF",
        resolution=300.0,
        save_all=True,
        append_images=remaining_pages,
    )

    for page in pages:
        page.close()

    print(f"Wrote {output_pdf} with {len(paths)} pages")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Merge page PNGs into one PDF, cropping a/b split pages first."
    )
    parser.add_argument(
        "-i",
        "--input-dir",
        type=Path,
        default=Path("."),
        help="Directory containing page PNGs. Defaults to the current directory.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("merged_pages.pdf"),
        help="Output PDF path. Defaults to merged_pages.pdf.",
    )
    parser.add_argument(
        "--crop-mode",
        choices=("content", "half", "none"),
        default="content",
        help=(
            "Cropping mode. 'content' removes black/empty scanner background, "
            "'half' uses the original 50%% a/b crop, and 'none' keeps images as-is. "
            "Defaults to content."
        ),
    )
    parser.add_argument(
        "--margin",
        type=int,
        default=DEFAULT_MARGIN,
        help=f"Pixels of margin to keep around auto-cropped content. Defaults to {DEFAULT_MARGIN}.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    merge_pngs_to_pdf(args.input_dir, args.output, args.crop_mode, args.margin)


if __name__ == "__main__":
    main()
