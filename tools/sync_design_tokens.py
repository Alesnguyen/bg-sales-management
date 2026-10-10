#!/usr/bin/env python3
"""Generate the standalone preview CSS variables from design-tokens.json."""
from __future__ import annotations
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKENS = ROOT / "design-tokens.json"
HTML = ROOT / "index.html"
START = "/* DESIGN-TOKENS:BEGIN */"
END = "/* DESIGN-TOKENS:END */"
THEME_MAP = {
    "background": "bg", "surface": "surface", "surfaceRaised": "surface-raised",
    "surfaceSubtle": "surface-subtle", "text": "text", "textSecondary": "text-secondary",
    "border": "border", "accent": "accent", "accentHover": "accent-hover",
    "accentPressed": "accent-pressed", "onAccent": "on-accent", "focus": "focus",
    "focusHalo": "focus-halo", "success": "success", "warning": "warning",
    "danger": "danger", "disabledText": "disabled-text", "disabledSurface": "disabled-surface",
    "successSurface": "success-surface", "warningSurface": "warning-surface",
    "dangerSurface": "danger-surface", "info": "info", "infoSurface": "info-surface",
}

def css_val(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)

def build_block(t: dict) -> str:
    lines = [START, ":root {"]
    brand = t["brand"]
    for k, v in (("brand-yellow", brand["yellow"]), ("brand-black", brand["black"]), ("brand-white", brand["white"])):
        lines.append(f"  --{k}:{v};")
    lines.append("  color-scheme:light;")
    for key, var in THEME_MAP.items():
        value = t["themes"]["light"].get(key)
        if value is not None:
            lines.append(f"  --{var}:{value};")
    lines.append("}")
    lines.append(':root[data-theme="dark"] {')
    lines.append("  color-scheme:dark;")
    for key, var in THEME_MAP.items():
        value = t["themes"]["dark"].get(key)
        if value is not None:
            lines.append(f"  --{var}:{value};")
    lines.append("}")
    lines.append(":root {")
    typ = t["typography"]
    lines.append(f"  --font-family:{typ['family']};")
    lines.append(f"  --line-height-body:{typ['lineHeight']};")
    for name, value in typ["sizes"].items():
        lines.append(f"  --font-size-{name}:{value};")
    for name, value in typ["weights"].items():
        lines.append(f"  --font-weight-{name}:{value};")
    for name, value in t["spacing"].items():
        lines.append(f"  --space-{name}:{value};")
    for name, value in t["radius"].items():
        lines.append(f"  --radius-{name}:{value};")
    for name, value in t["motion"].items():
        if name == "reducedMotionSupported":
            continue
        lines.append(f"  --motion-{name}:{value};")
    for name, value in t["shadows"].items():
        lines.append(f"  --shadow-{name}:{value};")
    layout = t["layout"]
    for name, value in layout.items():
        css_name = ''.join(('-' + c.lower() if c.isupper() else c) for c in name)
        lines.append(f"  --{css_name}:{value};")
    lines.append("  --shadow:var(--shadow-card);")
    lines.append("}")
    lines.append(END)
    return "\n".join(lines)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="check HTML token block without writing")
    args = parser.parse_args()
    tokens = json.loads(TOKENS.read_text(encoding="utf-8"))
    html = HTML.read_text(encoding="utf-8")
    block = build_block(tokens)
    if START in html and END in html:
        before, rest = html.split(START, 1)
        _, after = rest.split(END, 1)
        existing = START + rest.split(END, 1)[0] + END
        expected = block
        if args.check:
            if existing.strip() != expected.strip():
                print("FAIL: CSS token block không khớp design-tokens.json")
                return 1
            print("PASS: CSS token block khớp design-tokens.json")
            return 0
        result = before + block + after
    else:
        if args.check:
            print("FAIL: không tìm thấy marker Design Tokens trong index.html")
            return 1
        start = html.index("<style>") + len("<style>")
        end = html.index("*{box-sizing:border-box}", start)
        result = html[:start] + "\n" + block + "\n" + html[end:]
    if not args.check:
        HTML.write_text(result, encoding="utf-8")
        print("WROTE: CSS token block được đồng bộ từ design-tokens.json")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
