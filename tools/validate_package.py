#!/usr/bin/env python3
"""Offline design-package checks for BG Sales Management."""
from __future__ import annotations
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "index.html", "design-tokens.json", "DESIGN-SYSTEM.md", "COMPONENT-SPEC.md",
    "DESIGN-REVIEW-ROUND-2.md", "PROTOTYPE-FLOWS.md", "README.md", "QA-REPORT.md",
    "PROJECT-STATUS.md", "HANDOFF-MANIFEST.json", "assets/BG-Logo.jpg",
    "data/EXCEL-SOURCE-AUDIT.md", "data/EXCEL-TO-SQLITE-MAPPING.md",
    "data/excel-source-profile.json", "source-data/ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx",
    "tools/sync_design_tokens.py"
]

def rgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i:i+2], 16) / 255 for i in (0, 2, 4))

def luminance(hex_color: str) -> float:
    def channel(v: float) -> float:
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(hex_color)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def main() -> int:
    failures: list[str] = []
    notes: list[str] = []
    for name in REQUIRED:
        if not (ROOT / name).is_file():
            failures.append(f"Missing required file: {name}")
    if failures:
        print("FAIL: required files missing")
        for f in failures: print("  -", f)
        return 1

    try:
        tokens = json.loads((ROOT / "design-tokens.json").read_text(encoding="utf-8"))
        profile = json.loads((ROOT / "data" / "excel-source-profile.json").read_text(encoding="utf-8"))
        manifest = json.loads((ROOT / "HANDOFF-MANIFEST.json").read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"FAIL: JSON parse error: {exc}")
        return 1

    html = (ROOT / "design" / "prototype-v0.2.1.html").read_text(encoding="utf-8")  # kiểm tra bản vẽ; index.html được dựng từ bản vẽ + src/
    css = html.split("<style>", 1)[1].split("</style>", 1)[0]
    flows = (ROOT / "PROTOTYPE-FLOWS.md").read_text(encoding="utf-8")
    spec = (ROOT / "COMPONENT-SPEC.md").read_text(encoding="utf-8")

    if tokens.get("version") != "0.2.1": failures.append("Token version must be 0.2.1")
    if tokens.get("status", "").find("normalization") < 0: failures.append("Token status should indicate normalization")
    if tokens.get("brand", {}).get("yellow") != "#FFDF1B" or tokens.get("brand", {}).get("black") != "#000000" or tokens.get("brand", {}).get("white") != "#FFFFFF":
        failures.append("Brand primitives mismatch")
    if manifest.get("package") != "BG-Sales-Management-Design-System-v0.2.1": failures.append("Handoff manifest package name mismatch")
    if manifest.get("sourceAudit", {}).get("range") != "A1:AZ53": failures.append("Workbook audit range mismatch")
    if not profile.get("source_not_modified") or profile.get("selected_sheet_used_range") != "A1:AZ53": failures.append("Workbook source profile does not match audited range")
    if profile.get("customer_candidate_count") != 26 or profile.get("formula_cells_detected") != 196: failures.append("Workbook profile counts mismatch")

    for view in ("overview", "customers", "calendar", "import", "settings"):
        if f'data-view="{view}"' not in html: failures.append(f"Missing view {view}")
    for name in (f"PF-{i:02d}" for i in range(12)):
        if name not in flows: failures.append(f"Missing prototype flow {name}")
    for expected in ("Button", "Text field", "Data table", "Status badge", "Dialog / Confirmation", "Focus indicator"):
        if expected not in spec: failures.append(f"Component spec missing: {expected}")
    if "assets/BG-Logo.jpg" not in html: failures.append("Original logo is not referenced by HTML")
    if re.search(r'<script[^>]+src\s*=|<link[^>]+href\s*=\s*["\']https?://|url\(\s*["\']?https?://', html, re.I):
        failures.append("HTML preview contains external network dependencies")
    if not ("Prototype không đọc nội dung" in html or "HTML này không đọc nội dung workbook" in html):
        failures.append("Preview must disclose that Excel is not parsed/imported")
    if html.count("const splash=document.getElementById('splash')") != 1:
        failures.append("Expected exactly one Splash prototype timer block")
    if "prefers-reduced-motion" not in css: failures.append("Missing reduced-motion CSS")
    if "var(--focus-width)" not in css or "var(--focus-offset)" not in css: failures.append("Focus outline is not tokenized")

    # Ensure no hardcoded CSS color declarations live outside the generated token block.
    marker_start="/* DESIGN-TOKENS:BEGIN */"; marker_end="/* DESIGN-TOKENS:END */"
    if marker_start not in css or marker_end not in css:
        failures.append("Missing generated token block markers")
    else:
        outside=css.split(marker_start,1)[0]+css.split(marker_end,1)[1]
        if re.search(r'(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-[a-z-]+)?-color)\s*:\s*#[0-9a-f]{3,8}\b',outside,re.I):
            failures.append("Hardcoded color value found outside generated token block")
        sync=subprocess.run([sys.executable,str(ROOT/'tools'/'sync_design_tokens.py'),'--check'],capture_output=True,text=True)
        print(sync.stdout.strip() or sync.stderr.strip())
        if sync.returncode: failures.append("CSS token block is not synchronized with design-tokens.json")

    print("Contrast checks (target >= 4.5:1 for normal text):")
    state_pairs = [
        ("text/background", "text", "background"),
        ("text/surface", "text", "surface"),
        ("textSecondary/background", "textSecondary", "background"),
        ("textSecondary/surface", "textSecondary", "surface"),
        ("onAccent/accent", "onAccent", "accent"),
        ("success/successSurface", "success", "successSurface"),
        ("warning/warningSurface", "warning", "warningSurface"),
        ("danger/dangerSurface", "danger", "dangerSurface"),
        ("info/infoSurface", "info", "infoSurface"),
    ]
    for theme_name, theme in tokens["themes"].items():
        for label, fgkey, bgkey in state_pairs:
            ratio=contrast(theme[fgkey],theme[bgkey])
            print(f"  {theme_name:5s} {label:28s} {ratio:.2f}:1")
            if ratio < 4.5: failures.append(f"Contrast below 4.5:1: {theme_name} {label}={ratio:.2f}:1")
        disabled=contrast(theme["disabledText"],theme["disabledSurface"])
        print(f"  {theme_name:5s} {'disabledText/disabledSurface':28s} {disabled:.2f}:1 (note)")
        if disabled < 4.5: notes.append(f"{theme_name} disabled contrast {disabled:.2f}:1; review legibility (disabled colors are not normal text conformance criterion).")

    # Confirm embedded source workbook exactly matches the owner-provided workbook in this handoff package.
    original_candidates = [Path("/mnt/data/ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx"), ROOT/"source-data"/"ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx"]
    src=ROOT/"source-data"/"ALES-DANH SÁCH KH PHỤ TRÁCH 2026.xlsx"
    original=original_candidates[0]
    if original.is_file() and src.is_file() and sha256(original) != sha256(src):
        failures.append("Packaged workbook differs from current owner-provided workbook")
    if (ROOT/"assets"/"BG-Logo.jpg").stat().st_size < 1000: failures.append("Logo asset unexpectedly small")

    for note in notes: print("NOTE:",note)
    if failures:
        for failure in failures: print("FAIL:",failure)
        print(f"RESULT: FAIL ({len(failures)} issue(s))")
        return 1
    print("PASS: package structure, brand, token sync, component spec, offline preview, workbook profile, and contrast checks.")
    print("LIMIT: no native Windows app, real Excel import, SQLite or screen-reader acceptance in this package.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
