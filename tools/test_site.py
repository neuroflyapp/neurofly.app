"""Small regression checks for the static site's critical visitor paths."""

from pathlib import Path
from html.parser import HTMLParser
import re
import unittest
from urllib.parse import unquote, urlsplit


DOCS = Path(__file__).resolve().parent.parent / "docs"


class LinkReader(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.links.append(href)


class VisitorPathTests(unittest.TestCase):
    def test_support_is_available_without_javascript(self):
        home = (DOCS / "index.html").read_text(encoding="utf-8")
        section = re.search(r'<section class="support-band"[^>]*>', home)
        self.assertIsNotNone(section)
        self.assertNotIn("hidden", section.group())
        self.assertRegex(home, r'href="https://donate\.stripe\.com/[^\"]+"[^>]*data-track="donate-checkout"')
        self.assertNotIn('href="#support" data-support-go', home)

    def test_every_page_navigation_reaches_support(self):
        for path in DOCS.glob("*.html"):
            page = path.read_text(encoding="utf-8")
            if '<nav class="site-nav"' in page:
                with self.subTest(page=path.name):
                    self.assertIn('<a href="./#support">Support</a>', page)
                    self.assertNotIn('data-support-link hidden', page)

    def test_background_film_can_be_paused(self):
        home = (DOCS / "index.html").read_text(encoding="utf-8")
        script = (DOCS / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertIn('data-hero-motion', home)
        self.assertIn('userPaused', script)
        self.assertIn('hero.pause()', script)

    def test_editorial_films_wait_for_the_visitor(self):
        for name in ("science.html", "vision.html"):
            with self.subTest(page=name):
                page = (DOCS / name).read_text(encoding="utf-8")
                self.assertIn('<video controls muted loop', page)
                self.assertNotIn('data-autoplay', page)

    def test_local_navigation_targets_exist(self):
        root = DOCS.resolve()
        for source in DOCS.glob("*.html"):
            reader = LinkReader()
            reader.feed(source.read_text(encoding="utf-8"))
            for href in reader.links:
                url = urlsplit(href)
                if url.scheme or url.netloc:
                    continue
                path = unquote(url.path)
                target = root / path.lstrip("/") if path.startswith("/") else source.parent / path
                if not path or path.endswith("/"):
                    target = target / "index.html" if path else source
                target = target.resolve()
                with self.subTest(source=source.name, href=href):
                    self.assertTrue(target.is_relative_to(root), "link escapes the site")
                    self.assertTrue(target.is_file(), "local target missing")
                    if url.fragment and target.suffix == ".html":
                        html = target.read_text(encoding="utf-8")
                        anchor = re.escape(unquote(url.fragment))
                        has_anchor = re.search(rf'\bid=["\']{anchor}["\']', html)
                        has_tab = re.search(rf'\bdata-hash=["\']{anchor}["\']', html)
                        self.assertTrue(has_anchor or has_tab, "anchor missing")


if __name__ == "__main__":
    unittest.main()
