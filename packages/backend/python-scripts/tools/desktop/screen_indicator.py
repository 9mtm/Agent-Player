#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Screen Indicator — draws a thin colored border around a monitor.

Usage:
  python screen_indicator.py <left> <top> <width> <height> [color] [thickness]

Arguments:
  left, top          : Monitor top-left corner in absolute screen coordinates
  width, height      : Monitor dimensions in pixels
  color              : Border hex color  (default: #0066ff)
  thickness          : Border thickness  (default: 5)

The window is borderless, always-on-top, and transparent in the center so only
the border ring is visible.  It stays open until the process is killed.
"""

import sys
import tkinter as tk


def run(left: int, top: int, width: int, height: int,
        color: str = '#0066ff', thickness: int = 5) -> None:

    root = tk.Tk()
    root.overrideredirect(True)          # No title bar / decorations
    root.attributes('-topmost', True)    # Always on top of other windows
    root.attributes('-alpha', 0.88)      # Slight transparency for the border itself

    # Fill background with a unique key colour that will be made transparent
    # on Windows, leaving only the border ring visible.
    BG = 'black'
    root.configure(bg=BG)
    if sys.platform == 'win32':
        root.attributes('-transparentcolor', BG)

    # Position exactly over the target monitor
    root.geometry(f'{width}x{height}+{left}+{top}')

    canvas = tk.Canvas(root, bg=BG, highlightthickness=0)
    canvas.pack(fill='both', expand=True)

    # ── Outer glow (slightly wider, dimmer) ───────────────────────────────────
    glow = thickness + 4
    half_g = glow // 2
    canvas.create_rectangle(
        half_g, half_g,
        width - half_g, height - half_g,
        outline=color, width=glow,
        fill=BG,
        stipple='gray25',   # 25% density → visible but light
    )

    # ── Main border ring ──────────────────────────────────────────────────────
    half = thickness // 2
    canvas.create_rectangle(
        half, half,
        width - half, height - half,
        outline=color, width=thickness,
        fill=BG,
    )

    root.mainloop()


if __name__ == '__main__':
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)

    _left      = int(sys.argv[1])
    _top       = int(sys.argv[2])
    _width     = int(sys.argv[3])
    _height    = int(sys.argv[4])
    _color     = sys.argv[5] if len(sys.argv) > 5 else '#0066ff'
    _thickness = int(sys.argv[6]) if len(sys.argv) > 6 else 5

    run(_left, _top, _width, _height, _color, _thickness)
