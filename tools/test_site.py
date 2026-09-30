"""Small regression checks for the static site's critical visitor paths."""

from pathlib import Path
import re
import unittest


DOCS = Path(__file__).resolve().parent.parent / "docs"


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


if __name__ == "__main__":
    unittest.main()
