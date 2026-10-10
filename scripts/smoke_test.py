#!/usr/bin/env python3
"""Fast, dependency-free smoke checks for NexoraWildfire AI's core pages."""
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "index.html",
    "pages/map.html",
    "pages/areas.html",
    "pages/feedback.html",
    "data/turkiye_iller.geojson",
    "data/admin/tur_admin2.geojson",
    "manifest.webmanifest",
    "js/map.js",
    "js/areas.js",
    "js/free-data-layers.js",
    "js/nova-storage.js",
    "js/nova-offline-engine.js",
    "js/pwa.js",
]
CORE_HTML = ["index.html", "pages/map.html", "pages/areas.html", "pages/feedback.html"]

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ("src", "href"):
            value = attrs.get(key, "")
            if value:
                self.paths.append(value)

errors = []
for item in REQUIRED:
    if not (ROOT / item).is_file():
        errors.append(f"Missing required core file: {item}")

for html in CORE_HTML:
    path = ROOT / html
    if not path.is_file():
        continue
    parser = Assets()
    parser.feed(path.read_text(encoding="utf-8"))
    for raw in parser.paths:
        raw = raw.strip()
        if not raw or raw.startswith(("#", "https://", "http://", "//", "data:", "mailto:", "tel:", "javascript:")):
            continue
        parsed = urlsplit(raw)
        target = (path.parent / parsed.path).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{html}: local reference escapes repository: {raw}")
            continue
        if parsed.path and not target.is_file():
            errors.append(f"{html}: missing local asset {raw} -> {target.relative_to(ROOT.resolve())}")

if errors:
    print("CORE SMOKE TEST FAILED")
    print("\n".join(f"- {error}" for error in errors))
    sys.exit(1)

print(f"Core smoke checks passed for {len(REQUIRED)} required files and {len(CORE_HTML)} core pages.")
print("Note: these checks do not prove live API/provider health or browser end-to-end behavior.")
