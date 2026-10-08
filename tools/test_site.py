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
        self.ids = []

    def handle_starttag(self, tag, attrs):
        element_id = dict(attrs).get("id")
        if element_id:
            self.ids.append(element_id)
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
                    # Mobile's quick action may open Play; Support must remain in the menu.
                    self.assertRegex(page, r'class="mobile-support" href="(?:\./#support|play/\?workspace=habitat)"')
                    self.assertNotIn('data-support-link hidden', page)

    def test_background_film_always_plays(self):
        # The hero film always loads and plays: no pause control, and the
        # script restarts it whenever the browser stopped it.
        home = (DOCS / "index.html").read_text(encoding="utf-8")
        script = (DOCS / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertNotIn('data-hero-motion', home)
        self.assertRegex(home, r'<video class="hero-video" autoplay muted loop playsinline preload="auto"')
        self.assertIn('src="media/hero-1080.mp4"', home)
        # Narrow screens take the 720p H.264 film (4 MB instead of 8 MB).
        self.assertIn('<source src="media/hero-720.mp4" type="video/mp4" media="(max-width: 900px)">', home)
        self.assertIn('src="assets/site.js?v=20261001"', home)
        self.assertNotIn('hero.pause()', script)
        self.assertIn("hero.addEventListener(type, resume)", script)

    def test_social_profiles_are_current(self):
        for path in DOCS.glob("*.html"):
            page = path.read_text(encoding="utf-8")
            with self.subTest(page=path.name):
                self.assertNotIn('instagram.com/neurofly.app', page)
                self.assertNotIn('x.com/NeuroFlyApp', page)
                if '<ul class="social"' in page:
                    self.assertIn('https://www.instagram.com/neurocauseofficial/', page)
                    self.assertIn('https://x.com/neurocause"', page)
                    self.assertIn('https://www.tiktok.com/@neurofly', page)

    def test_own_measurement_needs_no_consent_but_clarity_does(self):
        script = (DOCS / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertNotIn('detailedMeasurementEnabled', script)
        self.assertIn("collector: 'https://get.neuro-cause.com/collect'", script)
        # Clarity's tag is only ever inserted by loadStatistics(), after consent.
        self.assertEqual(script.count('CONFIG.statistics.src'), 1)
        self.assertIn('if (c?.statistics) loadStatistics();', script)
        for path in DOCS.glob("*.html"):
            with self.subTest(page=path.name):
                self.assertNotIn('clarity.ms/tag', path.read_text(encoding="utf-8"))

    def test_supporter_prerelease_note_is_everywhere(self):
        home = (DOCS / "index.html").read_text(encoding="utf-8")
        terms = (DOCS / "terms.html").read_text(encoding="utf-8")
        software = (DOCS / "software-terms.html").read_text(encoding="utf-8")
        self.assertIn('class="support-perk"', home)
        self.assertIn('id="prereleases"', terms)
        self.assertIn('id="prereleases"', software)
        for path in DOCS.glob("*.html"):
            page = path.read_text(encoding="utf-8")
            if '<footer class="site-footer">' in page:
                with self.subTest(page=path.name):
                    self.assertIn('Support the lab &amp; pre-releases', page)

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

    def test_first_visit_and_science_boundaries(self):
        home = (DOCS / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="first-visit"', home)
        self.assertIn('href="#first-visit"', home)
        self.assertEqual(home.count('<summary>'), 4)
        for text in ('not automatically transfer', 'Subjective experience is not established', 'one-time payments'):
            self.assertIn(text, home)
        for text in ('Nothing is tuned by hand', 'A game where nothing is faked', 'wiring is used exactly as published'):
            self.assertNotIn(text, home)

    def test_unique_page_ids(self):
        for path in DOCS.glob("*.html"):
            reader = LinkReader()
            reader.feed(path.read_text(encoding="utf-8"))
            with self.subTest(page=path.name):
                self.assertEqual(len(reader.ids), len(set(reader.ids)), "duplicate IDs break navigation and accessible names")


if __name__ == "__main__":
    unittest.main()
