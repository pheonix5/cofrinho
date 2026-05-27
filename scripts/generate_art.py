"""
Generate icon and splash art for Cofrinho.
Uses project brand colors:
  bg        #0B0B0F
  bgSoft    #15151C
  brand     #9AE66E (mint green)
  brandDeep #5FC23B
  brandGlow #C8F5A6
"""
from __future__ import annotations
import math
import os
from PIL import Image, ImageDraw, ImageFilter

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')

BG = (11, 11, 15, 255)
BG_SOFT = (21, 21, 28, 255)
BRAND = (154, 230, 110, 255)
BRAND_DEEP = (95, 194, 59, 255)
BRAND_GLOW = (200, 245, 166, 255)
INK = (244, 244, 247, 255)


def make_canvas(size: int, bg=BG) -> Image.Image:
    return Image.new('RGBA', (size, size), bg)


def radial_glow(size: int, color, center, radius, alpha=120) -> Image.Image:
    """Soft radial glow blob."""
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    d.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(color[0], color[1], color[2], alpha),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius // 2))


def draw_piggy(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float, color, accent=None):
    """Draw a minimalist piggy bank silhouette centered at (cx, cy)."""
    if accent is None:
        accent = color
    # body — main rounded rectangle
    body_w = int(560 * scale)
    body_h = int(420 * scale)
    body = [cx - body_w // 2, cy - body_h // 2, cx + body_w // 2, cy + body_h // 2]
    radius = int(180 * scale)
    draw.rounded_rectangle(body, radius=radius, fill=color)

    # snout — small circle on the right
    snout_r = int(90 * scale)
    snout_cx = cx + body_w // 2 - int(30 * scale)
    snout_cy = cy + int(20 * scale)
    draw.ellipse(
        [snout_cx - snout_r, snout_cy - snout_r, snout_cx + snout_r, snout_cy + snout_r],
        fill=color,
    )
    # nostrils (cutouts)
    nostril_r = int(14 * scale)
    nostril_offset_y = int(28 * scale)
    nostril_offset_x = int(22 * scale)
    for dx in (-nostril_offset_x, nostril_offset_x):
        draw.ellipse(
            [snout_cx + dx - nostril_r, snout_cy + nostril_offset_y - nostril_r,
             snout_cx + dx + nostril_r, snout_cy + nostril_offset_y + nostril_r],
            fill=BG,
        )

    # ear — small triangle near the face (right side)
    ear_base_y = cy - body_h // 2 + int(40 * scale)
    ear_tip_y = cy - body_h // 2 - int(50 * scale)
    ear = [
        (cx + int(60 * scale), ear_base_y),
        (cx + int(150 * scale), ear_tip_y),
        (cx + int(180 * scale), ear_base_y),
    ]
    draw.polygon(ear, fill=color)

    # eye (small, near snout)
    eye_r = int(20 * scale)
    eye_cx = cx + int(190 * scale)
    eye_cy = cy - int(40 * scale)
    draw.ellipse(
        [eye_cx - eye_r, eye_cy - eye_r, eye_cx + eye_r, eye_cy + eye_r],
        fill=BG,
    )

    # coin slot (rounded rect cutout on top, centered)
    slot_w = int(220 * scale)
    slot_h = int(40 * scale)
    slot_cx = cx - int(80 * scale)
    slot_cy = cy - int(140 * scale)
    draw.rounded_rectangle(
        [slot_cx - slot_w // 2, slot_cy - slot_h // 2,
         slot_cx + slot_w // 2, slot_cy + slot_h // 2],
        radius=slot_h // 2,
        fill=BG,
    )

    # legs (two stubby rectangles at bottom)
    leg_w = int(80 * scale)
    leg_h = int(80 * scale)
    leg_y_top = cy + body_h // 2 - int(20 * scale)
    leg_radius = int(24 * scale)
    for dx in (-int(160 * scale), int(120 * scale)):
        leg_cx = cx + dx
        draw.rounded_rectangle(
            [leg_cx - leg_w // 2, leg_y_top,
             leg_cx + leg_w // 2, leg_y_top + leg_h],
            radius=leg_radius,
            fill=color,
        )

    # tiny curly tail (just an arc-ish circle)
    tail_r = int(34 * scale)
    tail_cx = cx - body_w // 2 + int(30 * scale)
    tail_cy = cy - int(30 * scale)
    draw.ellipse(
        [tail_cx - tail_r, tail_cy - tail_r, tail_cx + tail_r, tail_cy + tail_r],
        outline=color,
        width=int(20 * scale),
    )


def make_icon(size: int = 1024, with_bg: bool = True) -> Image.Image:
    img = make_canvas(size, BG if with_bg else (0, 0, 0, 0))
    if with_bg:
        # subtle glow behind the piggy
        glow = radial_glow(size, BRAND, (size // 2, int(size * 0.55)), int(size * 0.42), alpha=70)
        img = Image.alpha_composite(img, glow)
        # accent glow bottom-left
        glow2 = radial_glow(size, BRAND_DEEP, (int(size * 0.15), int(size * 0.85)),
                            int(size * 0.3), alpha=55)
        img = Image.alpha_composite(img, glow2)

    draw = ImageDraw.Draw(img)
    # piggy centered, scaled to fill nicely
    scale = size / 1024.0
    draw_piggy(draw, size // 2, int(size * 0.52), scale * 0.95, BRAND)
    return img


def make_splash(size: int = 1024) -> Image.Image:
    """Splash icon used by expo-splash-screen. Transparent bg, large piggy."""
    img = make_canvas(size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 1024.0
    draw_piggy(draw, size // 2, size // 2, scale * 1.05, BRAND)
    return img


def make_adaptive_foreground(size: int = 1024) -> Image.Image:
    """Android adaptive icon foreground — piggy with safe-zone padding."""
    img = make_canvas(size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Safe zone is the central 66% — keep piggy well inside
    scale = (size / 1024.0) * 0.68
    draw_piggy(draw, size // 2, size // 2, scale, BRAND)
    return img


def make_adaptive_background(size: int = 1024) -> Image.Image:
    """Android adaptive icon background — dark with brand glow."""
    img = make_canvas(size, BG)
    glow = radial_glow(size, BRAND, (size // 2, size // 2), int(size * 0.45), alpha=80)
    img = Image.alpha_composite(img, glow)
    glow2 = radial_glow(size, BRAND_DEEP, (int(size * 0.2), int(size * 0.85)),
                        int(size * 0.35), alpha=60)
    img = Image.alpha_composite(img, glow2)
    return img


def make_monochrome(size: int = 1024) -> Image.Image:
    """Android monochrome icon — white silhouette on transparent bg."""
    img = make_canvas(size, (0, 0, 0, 0))
    # We need a single-color silhouette. Draw piggy in white, then clean nostrils/eye/slot.
    # PIL approach: draw piggy, but use a "hole" color that's actually transparent.
    # Simpler: draw on an L mask.
    mask = Image.new('L', (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    scale = (size / 1024.0) * 0.68

    # filled piggy in mask
    cx = size // 2
    cy = size // 2
    body_w = int(560 * scale)
    body_h = int(420 * scale)
    radius = int(180 * scale)
    mdraw.rounded_rectangle(
        [cx - body_w // 2, cy - body_h // 2, cx + body_w // 2, cy + body_h // 2],
        radius=radius, fill=255,
    )
    snout_r = int(90 * scale)
    snout_cx = cx + body_w // 2 - int(30 * scale)
    snout_cy = cy + int(20 * scale)
    mdraw.ellipse(
        [snout_cx - snout_r, snout_cy - snout_r, snout_cx + snout_r, snout_cy + snout_r],
        fill=255,
    )
    ear_base_y = cy - body_h // 2 + int(40 * scale)
    ear_tip_y = cy - body_h // 2 - int(50 * scale)
    ear = [
        (cx + int(60 * scale), ear_base_y),
        (cx + int(150 * scale), ear_tip_y),
        (cx + int(180 * scale), ear_base_y),
    ]
    mdraw.polygon(ear, fill=255)
    # legs
    leg_w = int(80 * scale)
    leg_h = int(80 * scale)
    leg_y_top = cy + body_h // 2 - int(20 * scale)
    leg_radius = int(24 * scale)
    for dx in (-int(160 * scale), int(120 * scale)):
        leg_cx = cx + dx
        mdraw.rounded_rectangle(
            [leg_cx - leg_w // 2, leg_y_top, leg_cx + leg_w // 2, leg_y_top + leg_h],
            radius=leg_radius, fill=255,
        )
    # tail outline
    tail_r = int(34 * scale)
    tail_cx = cx - body_w // 2 + int(30 * scale)
    tail_cy = cy - int(30 * scale)
    mdraw.ellipse(
        [tail_cx - tail_r, tail_cy - tail_r, tail_cx + tail_r, tail_cy + tail_r],
        outline=255, width=int(20 * scale),
    )

    # cutouts (set back to 0)
    nostril_r = int(14 * scale)
    for dx in (-int(22 * scale), int(22 * scale)):
        mdraw.ellipse(
            [snout_cx + dx - nostril_r, snout_cy + int(28 * scale) - nostril_r,
             snout_cx + dx + nostril_r, snout_cy + int(28 * scale) + nostril_r],
            fill=0,
        )
    eye_r = int(20 * scale)
    eye_cx = cx + int(190 * scale)
    eye_cy = cy - int(40 * scale)
    mdraw.ellipse(
        [eye_cx - eye_r, eye_cy - eye_r, eye_cx + eye_r, eye_cy + eye_r],
        fill=0,
    )
    slot_w = int(220 * scale)
    slot_h = int(40 * scale)
    slot_cx = cx - int(80 * scale)
    slot_cy = cy - int(140 * scale)
    mdraw.rounded_rectangle(
        [slot_cx - slot_w // 2, slot_cy - slot_h // 2,
         slot_cx + slot_w // 2, slot_cy + slot_h // 2],
        radius=slot_h // 2, fill=0,
    )

    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    img.paste(white, (0, 0), mask)
    return img


def main():
    print(f'Writing assets to: {ASSETS}')
    make_icon(1024).save(os.path.join(ASSETS, 'icon.png'))
    print(' icon.png')

    make_splash(1024).save(os.path.join(ASSETS, 'splash-icon.png'))
    print(' splash-icon.png')

    make_adaptive_foreground(1024).save(os.path.join(ASSETS, 'android-icon-foreground.png'))
    print(' android-icon-foreground.png')

    make_adaptive_background(1024).save(os.path.join(ASSETS, 'android-icon-background.png'))
    print(' android-icon-background.png')

    make_monochrome(1024).save(os.path.join(ASSETS, 'android-icon-monochrome.png'))
    print(' android-icon-monochrome.png')

    favicon = make_icon(48)
    favicon.save(os.path.join(ASSETS, 'favicon.png'))
    print(' favicon.png')


if __name__ == '__main__':
    main()
