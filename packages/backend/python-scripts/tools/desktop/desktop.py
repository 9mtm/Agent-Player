#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tool: Desktop Control
Control the mouse, keyboard, and screen using pyautogui.

Supported actions:
  get_screens        : List all connected monitors (index, left, top, width, height)
  get_active_window  : Return the active window title, position, and which screen it is on
  show_indicator     : Show a colored border around a monitor to signal the agent is working there
  hide_indicator     : Remove the indicator border
  screenshot         : Capture screen; screen=0/1/2 for a specific monitor, omit for all combined
  mouse_move         : Move mouse to (x, y)
  mouse_click        : Click at (x, y) with left/right/middle button
  scroll             : Scroll the mouse wheel at (x, y); amount > 0 = up, < 0 = down
  drag               : Click-and-drag from (start_x, start_y) to (end_x, end_y)
  key_press          : Press a key or keyboard shortcut (e.g. 'enter', 'ctrl+c')
  type_text          : Type text using the keyboard
  wait               : Pause for N seconds (e.g. while waiting for an app to open)

Usage:
  python tools/desktop/desktop.py --args-file <json_file>

Args-file JSON keys (all actions):
  action        : string  -- one of the actions above

  For mouse_move / mouse_click:
    x           : number  -- X coordinate (pixels from left)
    y           : number  -- Y coordinate (pixels from top)
    button      : string  -- 'left' | 'right' | 'middle' (click only, default: left)
    clicks      : number  -- number of clicks (1 = single, 2 = double, default: 1)

  For key_press:
    keys        : string  -- key name or combo, e.g. 'enter', 'ctrl+c', 'alt+tab'

  For type_text:
    text        : string  -- text to type
    interval    : number  -- seconds between keystrokes (default: 0.03)

  For screenshot:
    screen      : number  -- monitor index (0=primary, 1=second...). Omit or -1 = all monitors combined.
    region      : object  -- explicit {left, top, width, height} override (ignores screen param)

  For wait:
    seconds     : number  -- how long to pause (default: 1)
"""

import sys
import io
import base64
import os
import time
from pathlib import Path

# Allow running from any working directory
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from utils.common import load_args_file, ok, fail

try:
    import pyautogui
    import PIL.Image
    import PIL.ImageGrab
except ImportError:
    fail(
        'pyautogui / pillow not installed. Run:\n'
        '  pip install pyautogui pillow'
        + (' pywin32' if sys.platform == 'win32' else '')
    )


# ─── Monitor enumeration ──────────────────────────────────────────────────────

def _get_monitors_win32() -> list:
    """Return a list of monitor rects using the Win32 API."""
    import ctypes
    from ctypes import wintypes

    monitors = []

    def _callback(_hmonitor, _hdc, lprect, _lparam):
        rect = lprect.contents
        monitors.append({
            'left': rect.left, 'top': rect.top,
            'width': rect.right - rect.left, 'height': rect.bottom - rect.top,
        })
        return True

    MonitorEnumProc = ctypes.WINFUNCTYPE(
        ctypes.c_bool,
        ctypes.c_void_p, ctypes.c_void_p,
        ctypes.POINTER(wintypes.RECT),
        ctypes.c_void_p,
    )
    ctypes.windll.user32.EnumDisplayMonitors(
        None, None, MonitorEnumProc(_callback), 0
    )
    return monitors


def _get_monitors() -> list:
    """Cross-platform monitor list.  Falls back to one entry = full virtual screen."""
    if sys.platform == 'win32':
        try:
            return _get_monitors_win32()
        except Exception:
            pass
    # Fallback: treat the entire virtual screen as one monitor
    w, h = pyautogui.size()
    return [{'left': 0, 'top': 0, 'width': w, 'height': h}]


# ─── Safety settings ──────────────────────────────────────────────────────────

# Keep failsafe enabled: moving mouse to top-left corner raises an exception.
pyautogui.FAILSAFE = True

# Small pause between actions so the OS can process events.
pyautogui.PAUSE = 0.05


# ─── Actions ──────────────────────────────────────────────────────────────────

def mouse_move(x: int, y: int) -> None:
    pyautogui.moveTo(x, y, duration=0.25)
    ok({'action': 'mouse_move', 'x': x, 'y': y})


def scroll(x: int, y: int, amount: int) -> None:
    """
    Scroll the mouse wheel at position (x, y).
    amount > 0 = scroll UP (positive pyautogui clicks)
    amount < 0 = scroll DOWN (negative pyautogui clicks)
    """
    pyautogui.moveTo(x, y, duration=0.15)
    pyautogui.scroll(amount)
    ok({'action': 'scroll', 'x': x, 'y': y, 'amount': amount})


def drag(start_x: int, start_y: int, end_x: int, end_y: int,
         button: str = 'left', duration: float = 0.4) -> None:
    """Click-and-drag from (start_x, start_y) to (end_x, end_y)."""
    pyautogui.moveTo(start_x, start_y, duration=0.2)
    pyautogui.dragTo(end_x, end_y, duration=duration, button=button)
    ok({'action': 'drag',
        'from': {'x': start_x, 'y': start_y},
        'to':   {'x': end_x,   'y': end_y},
        'button': button})


def mouse_click(x=None, y=None, button='left', clicks=1) -> None:
    if x is not None and y is not None:
        pyautogui.moveTo(x, y, duration=0.2)
    pyautogui.click(button=button, clicks=clicks, interval=0.1)
    ok({'action': 'mouse_click', 'x': x, 'y': y, 'button': button, 'clicks': clicks})


def key_press(keys: str) -> None:
    """
    Press a single key or a keyboard shortcut.
    Shortcuts use '+' as separator, e.g. 'ctrl+c', 'ctrl+shift+esc'.
    """
    parts = [k.strip() for k in keys.split('+')]
    if len(parts) > 1:
        pyautogui.hotkey(*parts)
    else:
        pyautogui.press(parts[0])
    ok({'action': 'key_press', 'keys': keys})


def type_text(text: str, interval: float = 0.03) -> None:
    """
    Type text character by character.
    Uses pyautogui.write for ASCII and clipboard paste for Unicode.
    """
    ascii_only = all(ord(c) < 128 for c in text)

    if ascii_only:
        pyautogui.write(text, interval=interval)
    else:
        # Use clipboard for Unicode text (more reliable on Windows)
        import subprocess
        try:
            if sys.platform == 'win32':
                subprocess.run(
                    ['powershell', '-command', f'Set-Clipboard -Value \'{text.replace(chr(39), chr(34))}\''],
                    capture_output=True, timeout=5
                )
                pyautogui.hotkey('ctrl', 'v')
            else:
                tool = 'pbcopy' if sys.platform == 'darwin' else 'xclip'
                subprocess.run([tool], input=text.encode('utf-8'), capture_output=True, timeout=5)
                pyautogui.hotkey('ctrl', 'v')
        except Exception:
            pyautogui.write(text, interval=interval)

    ok({'action': 'type_text', 'length': len(text), 'unicode': not ascii_only})


def wait(seconds: float) -> None:
    """Pause execution for the given number of seconds."""
    time.sleep(seconds)
    ok({'action': 'wait', 'seconds': seconds})


def get_screens() -> None:
    """Return the layout (position + size) of every connected monitor."""
    monitors = _get_monitors()
    for i, m in enumerate(monitors):
        m['index'] = i
    ok({'action': 'get_screens', 'screens': monitors, 'count': len(monitors)})


def get_active_window() -> None:
    """
    Return title, position, and screen index of the currently active window.
    On non-Windows systems returns partial information via xdotool if available.
    """
    monitors = _get_monitors()

    if sys.platform == 'win32':
        import ctypes
        from ctypes import wintypes

        hwnd = ctypes.windll.user32.GetForegroundWindow()

        # Window title
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
        title = buf.value

        # Window rect
        rect = wintypes.RECT()
        ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect))
        win_x, win_y = rect.left, rect.top
        win_w = rect.right - rect.left
        win_h = rect.bottom - rect.top
    else:
        import subprocess
        try:
            wid = subprocess.check_output(['xdotool', 'getactivewindow'], text=True).strip()
            info = subprocess.check_output(
                ['xdotool', 'getwindowgeometry', '--shell', wid], text=True
            )
            vals = dict(line.split('=', 1) for line in info.strip().splitlines() if '=' in line)
            title_raw = subprocess.check_output(
                ['xdotool', 'getwindowname', wid], text=True
            ).strip()
            win_x, win_y = int(vals.get('X', 0)), int(vals.get('Y', 0))
            win_w, win_h = int(vals.get('WIDTH', 0)), int(vals.get('HEIGHT', 0))
            title = title_raw
        except Exception as e:
            ok({'action': 'get_active_window', 'title': '', 'x': 0, 'y': 0,
                'width': 0, 'height': 0, 'screen': 0,
                'note': f'Could not detect active window: {e}'})
            return

    # Determine which monitor contains the window's centre point
    cx = win_x + win_w // 2
    cy = win_y + win_h // 2
    screen_index = 0
    for i, m in enumerate(monitors):
        if m['left'] <= cx < m['left'] + m['width'] and \
           m['top']  <= cy < m['top']  + m['height']:
            screen_index = i
            break

    ok({
        'action': 'get_active_window',
        'title':  title,
        'x': win_x, 'y': win_y,
        'width': win_w, 'height': win_h,
        'screen': screen_index,
        'screen_info': monitors[screen_index] if screen_index < len(monitors) else None,
    })


# PID file keeps track of the running indicator process (persists across calls)
_INDICATOR_PID_FILE = Path(__file__).parent / '.indicator.pid'
_INDICATOR_SCRIPT   = Path(__file__).parent / 'screen_indicator.py'


# ─── Cursor helpers ───────────────────────────────────────────────────────────

def _set_agent_cursor() -> None:
    """
    Replace the arrow cursor with a crosshair so the user can see that the
    agent is in control of the mouse.  Windows-only; silently ignored elsewhere.
    """
    if sys.platform != 'win32':
        return
    try:
        import ctypes
        IDC_CROSS  = 32515   # crosshair cursor resource ID
        OCR_NORMAL = 32512   # slot that holds the default arrow cursor
        cursor = ctypes.windll.user32.LoadCursorW(None, IDC_CROSS)
        if cursor:
            cursor_copy = ctypes.windll.user32.CopyIcon(cursor)
            if cursor_copy:
                ctypes.windll.user32.SetSystemCursor(cursor_copy, OCR_NORMAL)
    except Exception:
        pass


def _restore_cursor() -> None:
    """
    Restore all system cursors to the current Windows theme defaults.
    Windows-only; silently ignored elsewhere.
    """
    if sys.platform != 'win32':
        return
    try:
        import ctypes
        SPI_SETCURSORS = 0x0057
        ctypes.windll.user32.SystemParametersInfoW(SPI_SETCURSORS, 0, None, 0)
    except Exception:
        pass


def _kill_indicator() -> None:
    """Kill any running indicator process and restore the system cursor."""
    if not _INDICATOR_PID_FILE.exists():
        return
    try:
        pid = int(_INDICATOR_PID_FILE.read_text().strip())
        if sys.platform == 'win32':
            import subprocess as _sp
            _sp.run(['taskkill', '/PID', str(pid), '/F'],
                    capture_output=True, timeout=3)
        else:
            import signal as _sig
            os.kill(pid, _sig.SIGTERM)
    except Exception:
        pass
    try:
        _INDICATOR_PID_FILE.unlink()
    except Exception:
        pass
    # Always restore cursor when the indicator is killed
    _restore_cursor()


def show_indicator(screen: int, color: str = '#0066ff', thickness: int = 5) -> None:
    """
    Show a thin colored border around the given monitor to signal the agent
    is working there.  Also changes the mouse cursor to a crosshair.
    Non-blocking — returns immediately.
    """
    import subprocess

    _kill_indicator()  # hide any previous indicator (also restores cursor)
    _set_agent_cursor()  # crosshair cursor while agent is active

    monitors = _get_monitors()
    if screen >= len(monitors):
        fail(f'Screen {screen} out of range — only {len(monitors)} screen(s) detected.')
        return

    m = monitors[screen]
    kwargs: dict = {}
    if sys.platform == 'win32':
        kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW

    proc = subprocess.Popen(
        [sys.executable, str(_INDICATOR_SCRIPT),
         str(m['left']), str(m['top']), str(m['width']), str(m['height']),
         color, str(thickness)],
        **kwargs,
    )
    _INDICATOR_PID_FILE.write_text(str(proc.pid))

    # Move the mouse to the center of this screen so the agent is immediately
    # positioned on the correct monitor and ready to interact.
    center_x = m['left'] + m['width'] // 2
    center_y = m['top']  + m['height'] // 2
    try:
        pyautogui.moveTo(center_x, center_y, duration=0.3)
    except Exception:
        pass  # Non-fatal — indicator still works even if mouse move fails

    ok({'action': 'show_indicator', 'screen': screen, 'pid': proc.pid,
        'monitor': m, 'mouse_at': {'x': center_x, 'y': center_y}})


def hide_indicator() -> None:
    """Close the screen indicator border (if one is running)."""
    if not _INDICATOR_PID_FILE.exists():
        ok({'action': 'hide_indicator', 'note': 'No indicator was running'})
        return
    pid_text = _INDICATOR_PID_FILE.read_text().strip()
    _kill_indicator()
    ok({'action': 'hide_indicator', 'pid': int(pid_text)})


def screenshot(region=None, screen: int = -1) -> None:
    """
    Capture screen and return as base64-encoded JPEG.

    screen: -1 = all monitors combined (default), 0/1/2... = specific monitor index.
    region: explicit {left, top, width, height} override (ignores screen param).
    """
    if region and isinstance(region, dict):
        capture_region = (
            int(region['left']),
            int(region['top']),
            int(region['left']) + int(region['width']),
            int(region['top'])  + int(region['height']),
        )
        img = PIL.ImageGrab.grab(bbox=capture_region, all_screens=True)
    elif screen >= 0:
        monitors = _get_monitors()
        if screen >= len(monitors):
            fail(f'Screen {screen} out of range — only {len(monitors)} screen(s) detected.')
            return
        m = monitors[screen]
        bbox = (m['left'], m['top'],
                m['left'] + m['width'], m['top'] + m['height'])
        img = PIL.ImageGrab.grab(bbox=bbox, all_screens=True)
    else:
        img = PIL.ImageGrab.grab(all_screens=True)

    # Resize to reduce token cost when sent to Claude (max 960px wide)
    max_width = 960
    if img.width > max_width:
        ratio = max_width / img.width
        new_h = int(img.height * ratio)
        img = img.resize((max_width, new_h), PIL.Image.LANCZOS)

    # Save as JPEG (smaller than PNG = fewer tokens)
    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=50)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')

    ok({'action': 'screenshot', 'image': b64, 'format': 'jpeg',
        'width': img.width, 'height': img.height})


# ─── Stale indicator cleanup ──────────────────────────────────────────────────

def _cleanup_stale_indicator() -> None:
    """
    If the PID file exists but that process is no longer running, clean up:
    delete the PID file and restore the system cursor.
    Handles the case where the backend restarted without calling hide_indicator.
    """
    if not _INDICATOR_PID_FILE.exists():
        return
    try:
        pid = int(_INDICATOR_PID_FILE.read_text().strip())
        is_alive = False
        if sys.platform == 'win32':
            import subprocess as _sp
            result = _sp.run(
                ['tasklist', '/FI', f'PID eq {pid}', '/NH'],
                capture_output=True, text=True, timeout=3,
            )
            is_alive = str(pid) in result.stdout
        else:
            try:
                os.kill(pid, 0)
                is_alive = True
            except OSError:
                is_alive = False
        if not is_alive:
            try:
                _INDICATOR_PID_FILE.unlink()
            except Exception:
                pass
            _restore_cursor()
    except Exception:
        try:
            _INDICATOR_PID_FILE.unlink()
        except Exception:
            pass
        _restore_cursor()


# ─── Main dispatcher ──────────────────────────────────────────────────────────

def main() -> None:
    args = load_args_file()
    if args is None:
        print(__doc__)
        sys.exit(1)

    action = args.get('action')

    # Auto-cleanup: if the indicator process died (crash), restore cursor now
    if action not in ('show_indicator', 'hide_indicator'):
        _cleanup_stale_indicator()

    if action == 'mouse_move':
        mouse_move(int(args['x']), int(args['y']))

    elif action == 'mouse_click':
        mouse_click(
            x=args.get('x'),
            y=args.get('y'),
            button=args.get('button', 'left'),
            clicks=int(args.get('clicks', 1)),
        )

    elif action == 'scroll':
        scroll(int(args['x']), int(args['y']), int(args.get('amount', 3)))

    elif action == 'drag':
        drag(
            int(args['start_x']), int(args['start_y']),
            int(args['end_x']),   int(args['end_y']),
            button=args.get('button', 'left'),
            duration=float(args.get('duration', 0.4)),
        )

    elif action == 'key_press':
        key_press(args['keys'])

    elif action == 'type_text':
        type_text(args['text'], float(args.get('interval', 0.03)))

    elif action == 'screenshot':
        screenshot(args.get('region'), int(args.get('screen', -1)))

    elif action == 'get_screens':
        get_screens()

    elif action == 'get_active_window':
        get_active_window()

    elif action == 'show_indicator':
        show_indicator(
            int(args['screen']),
            color=args.get('color', '#0066ff'),
            thickness=int(args.get('thickness', 5)),
        )

    elif action == 'hide_indicator':
        hide_indicator()

    elif action == 'wait':
        wait(float(args.get('seconds', 1)))

    else:
        fail(f'Unknown action: {action!r}. Valid: get_screens, get_active_window, show_indicator, hide_indicator, screenshot, mouse_move, scroll, drag, mouse_click, key_press, type_text, wait')


if __name__ == '__main__':
    main()
