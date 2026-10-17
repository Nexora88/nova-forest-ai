#!/usr/bin/env python3
"""Validate local HTML asset/page references and local CSS url() assets."""
from __future__ import annotations

import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
HTML_ATTRS = {"src", "href", "poster", "data-src"}
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.IGNORECASE)


def local_target(raw: str, base: Path) -> Path | None:
    value = raw.strip()
    if not value or value.startswith(("#", "data:", "blob:", "javascript:", "mailto:", "tel:")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith("//"):
        return None
    path = unquote(parsed.path)
    if not path or path == "/" or path.startswith("/api/"):
        return None
    if path.startswith("/"):
        return (ROOT / path.lstrip("/")).resolve()
    return (base / path).resolve()


class RefParser(HTMLParser):
    def __init__(self, file: Path):
        super().__init__(convert_charrefs=True)
        self.file = file
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attr in HTML_ATTRS:
            value = attrs.get(attr)
            if value:
                self.refs.append((attr, value))
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "refresh":
            content = attrs.get("content", "")
            match = re.search(r"url\s*=\s*['\"]?([^'\"]+)", content, re.I)
            if match:
                self.refs.append(("meta-refresh", match.group(1)))


def check_html(file: Path) -> list[str]:
    parser = RefParser(file)
    parser.feed(file.read_text(encoding="utf-8", errors="replace"))
    failures = []
    for attr, value in parser.refs:
        target = local_target(value, file.parent)
        if target is not None and not target.exists():
            failures.append(f"{file.relative_to(ROOT)}: missing {attr}={value!r} -> {target}")
    return failures


def check_css(file: Path) -> list[str]:
    failures = []
    content = file.read_text(encoding="utf-8", errors="replace")
    for match in CSS_URL.finditer(content):
        value = match.group(2).strip()
        target = local_target(value, file.parent)
        if target is not None and not target.exists():
            failures.append(f"{file.relative_to(ROOT)}: missing CSS url({value!r}) -> {target}")
    return failures


def main() -> int:
    failures = []
    for file in sorted(ROOT.rglob("*.html")):
        if any(part in {".git", "node_modules"} for part in file.parts):
            continue
        failures.extend(check_html(file))
    for file in sorted((ROOT / "css").rglob("*.css")):
        failures.extend(check_css(file))
    if failures:
        print("Local page/asset validation failed:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print("Local page links, HTML assets, and CSS url() references are present.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
