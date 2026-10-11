"""Static checks for broken local HTML links and asset paths."""
from __future__ import annotations

import re
import unittest
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
HTML_PAGES = [
    ROOT / "index.html",
    *(ROOT / "pages" / name for name in (
        "map.html", "areas.html", "weather.html", "events.html", "satellite.html",
        "account.html", "about.html", "vision.html", "feedback.html", "legal.html",
        "auth.html", "enterprise.html",
    )),
]
REFERENCE = re.compile(r"\b(?:href|src)\s*=\s*[\"']([^\"']*)[\"']", re.IGNORECASE)


class LocalAssetPathTests(unittest.TestCase):
    def test_all_local_html_links_and_assets_exist(self):
        missing = []
        for source in HTML_PAGES:
            html = source.read_text(encoding="utf-8")
            for raw in REFERENCE.findall(html):
                url = urlsplit(raw.strip())
                if url.scheme or url.netloc or not url.path:
                    continue
                target = unquote(url.path)
                if target.startswith("#"):
                    continue
                if target.startswith("/"):
                    candidate = (ROOT / target.lstrip("/")).resolve()
                else:
                    candidate = (source.parent / target).resolve()
                if candidate.is_dir():
                    candidate = candidate / "index.html"
                if not candidate.is_file():
                    missing.append(f"{source.relative_to(ROOT)}: {raw} -> {candidate}")
        self.assertEqual([], missing, "Broken local href/src references:\\n" + "\\n".join(missing))


if __name__ == "__main__":
    unittest.main(verbosity=2)
