"""Build the legal pages of neurofly.app and give every page the same footer.

Run from the repository root:  python tools/build_legal.py

Facts behind the wording (checked 23 September 2026; re-check before changing):
- Hosting: GitHub Pages. GitHub logs visitor IP addresses for security and
  participates in the EU-U.S. and Swiss-U.S. Data Privacy Frameworks.
- Own statistics (since 25/26 September 2026): assets/site.js sends page views,
  referrer, campaign parameters, screen width, time on page, scroll depth and
  clicks (downloads, films, forms, links) to get.neurofly.app/collect; the
  Cloudflare Worker adds country/region/city, device, browser, system and
  language from the request and stores daily totals only (D1). Visitors are told
  apart per UTC day by a hash of a random daily salt, IP and user agent; salt and
  hashes are deleted after the day, the IP is never stored. No cookies, nothing
  in the browser.
- Donations: Stripe Payment Links (TWINT, cards, Apple/Google Pay), links set in
  assets/site.js CONFIG.donate; the support section is hidden until then.
- Statistics: Rybbit (app.rybbit.io), loaded only after consent by
  assets/site.js. Site configuration served by Rybbit: pageviews, outbound
  links and URL parameters on; session replay, web vitals, errors, clicks,
  copy and form tracking off. The script stores `rybbit-visitor-id` in
  localStorage. Rybbit states EU hosting (Hetzner, Germany/Finland) and
  retention of 3 years on the Standard plan.
- Forms: Airform (airform.io, open source), served from Heroku behind
  Cloudflare.
- Mail: contact@neurofly.app is hosted by Apple iCloud Mail (MX records);
  Apple uses standard contractual clauses for EEA/UK/CH transfers.
- Desktop app 2.2.0 (as 2.1.0): no network code; runtime test with all workspaces made
  0 network requests. UI preferences are kept in the app's own local storage;
  exports go only where the user saves them.
"""
import pathlib
import re

DOCS = pathlib.Path(__file__).resolve().parent.parent / 'docs'
UPDATED = '23 September 2026'
PRIVACY_UPDATED = '26 September 2026'   # privacy notice and cookies: statistics, donations
TERMS_UPDATED = '26 September 2026'     # terms of use: donations

CSP = ("default-src 'self'; script-src 'self' https://app.rybbit.io; connect-src 'self' https://app.rybbit.io https://get.neurofly.app; "
       "img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self' https://airform.io; "
       "base-uri 'self'; object-src 'none'")

FOOTER = """<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div><img src="brand/neurofly-logo-dark.svg" alt="NeuroFly" width="72" height="26"><p>An in-silico fruit fly built on measured connectomes. An independent research and teaching project from Zurich.</p>
        <ul class="social" aria-label="NeuroFly on social media"><li><a href="https://www.instagram.com/neurofly.app/" target="_blank" rel="me noopener" aria-label="NeuroFly on Instagram (opens in a new tab)" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"/></svg></a></li><li><a href="https://www.tiktok.com/@neurofly" target="_blank" rel="me noopener" aria-label="NeuroFly on TikTok (opens in a new tab)" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a></li><li><a href="https://x.com/NeuroFlyApp" target="_blank" rel="me noopener" aria-label="NeuroFly on X (opens in a new tab)" title="X"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a></li><li><a href="https://github.com/neuroflyapp/neurofly" target="_blank" rel="me noopener" aria-label="NeuroFly on GitHub (opens in a new tab)" title="GitHub"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a></li></ul></div>
      <div><h4>Project</h4><ul><li><a href="science.html">Methods</a></li><li><a href="evidence.html">Evidence</a></li><li><a href="vision.html">Vision &amp; roadmap</a></li><li><a href="ethics.html">Ethics</a></li><li><a href="https://github.com/neuroflyapp/neurofly">Source code</a></li></ul></div>
      <div><h4>Get involved</h4><ul><li><a href="contact.html">Contact</a></li><li><a href="contact.html#suggest">Suggest an improvement</a></li><li><a href="contact.html#suggest">Report a scientific error</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="imprint.html">Imprint</a></li><li><a href="privacy.html">Privacy notice</a></li><li><a href="cookies.html">Cookies</a></li><li><a href="terms.html">Terms of use</a></li><li><button type="button" class="linklike" data-privacy-settings>Privacy settings</button></li></ul></div>
    </div>
    <p class="fine">Data: FlyWire FAFB v783 (CC BY-NC 4.0), MaleCNS v1.0 and BANC v888 (CC BY 4.0); see <a href="legal.html#licences">licences &amp; credits</a>.
      NeuroFly is not affiliated with or endorsed by the institutions that produced these datasets. Wiring and synapse counts are
      measured; neural dynamics, senses, body and behaviour are models, and NeuroFly makes no claim that the model feels anything.
      © 2026 NeuroFly.</p>
  </div>
</footer>"""

HEADER = """<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="./" aria-label="NeuroFly home"><img src="brand/neurofly-logo-dark.svg" alt="NeuroFly" width="77" height="28"></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <a href="science.html">Science</a>
      <a href="evidence.html">Evidence</a>
      <a href="vision.html">Vision</a>
      <a href="ethics.html">Ethics</a>
      <a href="contact.html">Contact</a>
      <a href="index.html#support" data-support-link hidden>Support</a>
      <a class="cta" href="index.html#get" data-track="nav-get">Get NeuroFly</a>
    </nav>
  </div>
</header>"""


def page(name, title, description, kicker, h1, lead, body, robots='index, follow'):
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{title} — NeuroFly</title>
<meta name="description" content="{description}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="https://neurofly.app/{name}">
<meta name="theme-color" content="#0c1311">
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="brand/neurofly-favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="brand/neurofly-icon-180.png">
<link rel="manifest" href="site.webmanifest">
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
{HEADER}

<main id="main">
<div class="page-head">
  <div class="wrap">
    <span class="kicker">{kicker}</span>
    <h1>{h1}</h1>
    {f'<p class="lead">{lead}</p>' if lead else ''}
  </div>
</div>
{body}
</main>

{FOOTER}
<script src="assets/site.js" defer></script>
</body>
</html>
"""
    (DOCS / name).write_text(html, encoding='utf-8')


def section(inner, alt=False, id_=None):
    ident = f' id="{id_}"' if id_ else ''
    return f"""
<section class="block{' alt' if alt else ''}"{ident}>
  <div class="wrap prose legal">
{inner}
  </div>
</section>"""


# ---- imprint -----------------------------------------------------------------------------
page('imprint.html', 'Imprint', 'Imprint of the NeuroFly website and software.', 'Legal', 'Imprint', '', section(f"""
    <h2>Operator</h2>
    <p class="address">NeuroFly<br>Zurich, Switzerland<br>Email: <a href="mailto:contact@neurofly.app">contact@neurofly.app</a></p>
    <p>NeuroFly operates this website and publishes the NeuroFly software. It is an independent, non-commercial research and
      teaching project. It is not affiliated with or endorsed by the institutions that produced the scientific datasets it uses.</p>
    <p>Legal notices, questions about this website and requests concerning your personal data can be sent to the email address
      above.</p>

    <h2>Disclaimer</h2>
    <p>NeuroFly assumes no liability whatsoever for the correctness, accuracy, timeliness, reliability or completeness of the
      information on this website. Liability claims against NeuroFly for damage of a material or immaterial nature arising from
      access to, use or non-use of the published information, from misuse of the connection or from technical faults are
      excluded. All content is non-binding. NeuroFly expressly reserves the right to change, supplement or delete parts of the
      website or the entire offering, or to suspend or end publication temporarily or permanently, without notice.</p>
    <p>References and links to third-party websites lie outside our area of responsibility. Any responsibility for such websites
      is declined. Accessing and using such websites is at the user’s own risk.</p>

    <h2>Copyright</h2>
    <p>The copyright and all other rights in the content, images, films, sound, design and other files on this website belong
      exclusively to NeuroFly or the specifically named rights holders. Reproduction of any element requires the prior written
      consent of the rights holder, except where material is expressly published under a licence that permits it. The NeuroFly
      program code is licensed under the PolyForm Noncommercial License 1.0.0; commercial use requires a separate licence from
      NeuroFly. The scientific datasets keep their own licences: FlyWire FAFB v783 under CC BY-NC 4.0,
      MaleCNS v1.0 and BANC v888 under CC BY 4.0; see <a href="legal.html#licences">licences &amp; credits</a>. Naming a dataset or
      publication does not imply that its authors endorse NeuroFly.</p>

    <h2>Related documents</h2>
    <p><a href="privacy.html">Privacy notice</a> · <a href="cookies.html">Cookies</a> · <a href="terms.html">Terms of
      use</a> · <a href="software-terms.html">Software terms</a></p>
    <p class="small">Last updated: {UPDATED}.</p>"""))

# ---- privacy notice ------------------------------------------------------------------------
privacy = f"""
    <p class="small">Effective {PRIVACY_UPDATED}.</p>
    <p>This notice explains which personal data NeuroFly processes when you visit neurofly.app, write to us, or use the NeuroFly
      software, why, and what you can do about it. It follows the Swiss Federal Act on Data Protection (FADP) and, where it
      applies to you, the EU General Data Protection Regulation (GDPR).</p>

    <h2 id="controller">1. Who is responsible</h2>
    <p>NeuroFly, Zurich, Switzerland, <a href="mailto:contact@neurofly.app">contact@neurofly.app</a>. See the
      <a href="imprint.html">imprint</a>.</p>

    <h2 id="overview">2. What we process, and why</h2>
    <div class="facts-list">
      <div class="fact-item"><h3>When you visit the website</h3><dl>
        <dt>Data</dt><dd>Technical and usage data: IP address, date and time, pages visited, referring page and campaign parameters,
          browser, operating system, device type, screen size, language, approximate location derived from the IP address, and how
          the pages are used (for example time on a page, scrolling, and use of downloads, films, forms and links).</dd>
        <dt>Purpose and basis</dt><dd>Delivering, securing and improving the website and measuring its use; our legitimate interest
          (GDPR Art. 6(1)(f)). No cookies are used for this and nothing is stored in your browser. To tell visits apart, a
          pseudonymous value derived from the IP address and browser details is used for one day at most.</dd>
        <dt>Recipients</dt><dd>Our hosting and infrastructure providers, GitHub (GitHub Pages) and Cloudflare.</dd></dl></div>
      <div class="fact-item"><h3>When you accept statistics</h3><dl>
        <dt>Data</dt><dd>Page address including its parameters, referring page, browser, operating system, device type, screen size,
          language, approximate location derived from the IP address, clicks on links to other sites, and a random visitor ID stored
          in your browser.</dd>
        <dt>Purpose and basis</dt><dd>Understanding which pages are read, to improve them. Only with your consent (GDPR Art. 6(1)(a)),
          which you can withdraw at any time under <button type="button" class="linklike ink" data-privacy-settings>privacy settings</button>.</dd>
        <dt>Recipient</dt><dd>Rybbit (rybbit.com), which stores statistics on servers in the EU (Hetzner, Germany and Finland). See
          section 3.</dd></dl></div>
      <div class="fact-item"><h3>When you use the contact or suggestion form</h3><dl>
        <dt>Data</dt><dd>What you enter: name, email address, organisation, role, topic and message, or your suggestion and reference.</dd>
        <dt>Purpose and basis</dt><dd>Answering you and reviewing suggestions and scientific corrections: our legitimate interest in
          replying and in correcting and improving the project, or steps you ask for before an agreement (GDPR Art. 6(1)(f), 6(1)(b)).</dd>
        <dt>Recipients</dt><dd>Airform (airform.io), which forwards the form to our mailbox, and Apple (iCloud Mail), which hosts the
          mailbox. See section 4.</dd></dl></div>
      <div class="fact-item"><h3>When you email us</h3><dl>
        <dt>Data</dt><dd>Your email address, the message and anything you attach.</dd>
        <dt>Purpose and basis</dt><dd>Answering you, as for the forms.</dd>
        <dt>Recipient</dt><dd>Apple (iCloud Mail).</dd></dl></div>
      <div class="fact-item" id="donations"><h3>When you donate</h3><dl>
        <dt>Data</dt><dd>What you enter at checkout, such as name, email address, billing details and payment method, and the amount,
          date and status of the donation.</dd>
        <dt>Purpose and basis</dt><dd>Processing the donation, thanking you, bookkeeping and legal obligations; steps you ask for
          (GDPR Art. 6(1)(b)), legal obligations (Art. 6(1)(c)) and our legitimate interest (Art. 6(1)(f)). Records are kept for
          as long as the law requires, for accounting records generally ten years.</dd>
        <dt>Recipients</dt><dd>Stripe, which processes the payment, partly as a controller in its own right (for example to prevent
          fraud), and the payment method you choose (for example TWINT or your card issuer).</dd></dl></div>
      <div class="fact-item"><h3>When you download NeuroFly</h3><dl>
        <dt>Data</dt><dd>IP address, time, the requested file, and the browser and network details that every download carries.
          For a download started on this website we record only the date and the file name, to count downloads; no IP address,
          cookie or other identifier is stored for this.</dd>
        <dt>Purpose and basis</dt><dd>Delivering the download and counting downloads; legitimate interest (GDPR Art. 6(1)(f)).</dd>
        <dt>Recipients</dt><dd>Cloudflare, which runs our download counter at get.neurofly.app and forwards you to the file, and
          GitHub (GitHub Releases), which serves the file under its own privacy statement.</dd></dl></div>
      <div class="fact-item"><h3>When you use NeuroFly on your computer</h3><dl>
        <dt>Data</dt><dd>Your settings, simulation runs, recordings and exports.</dd>
        <dt>Purpose</dt><dd>Running the software on your device.</dd>
        <dt>Recipient</dt><dd>No one. The software sends nothing to us or to anyone else (section 5).</dd></dl></div>
    </div>
    <p>Fields marked as required on the forms are needed to process your request; without a return address we cannot reply.</p>

    <h2 id="statistics">3. Page statistics</h2>
    <p>In addition to the measurement described in section 2, you can allow page statistics by Rybbit. Nothing from Rybbit is
      loaded unless you choose <em>Accept all</em> in the cookie banner or switch on statistics in the privacy settings.</p>
    <p>If you accept, the Rybbit script loads from app.rybbit.io and records the data listed above. Rybbit states that it uses
      the IP address only briefly to derive an approximate location and does not store it. The script keeps a random visitor ID in
      your browser’s local storage (<code>rybbit-visitor-id</code>) so that a repeat visit is counted as one visitor. Session
      recording, error reporting and tracking of clicks, copying and form input are switched off for this site.</p>
    <p>Rybbit keeps the statistics for the retention period of our plan, three years on the Standard plan, and then deletes them.
      Rybbit uses further service providers, among them Cloudflare (USA) for its network; the current list is published at
      <a href="https://rybbit.com/subprocessors">rybbit.com/subprocessors</a>. You can withdraw your consent at any time under
      <button type="button" class="linklike ink" data-privacy-settings>privacy settings</button>; the visitor ID is then removed
      from your browser. Withdrawal does not affect statistics recorded before it.</p>

    <h2 id="forms">4. Contact form, suggestions and email</h2>
    <p>The forms on the <a href="contact.html">contact page</a> are transmitted through Airform (airform.io), a form service that
      forwards submissions to our mailbox by email. Airform runs on the infrastructure of Heroku (Salesforce, USA) and Cloudflare
      (USA). Its own terms apply to its processing. Instead of using a form you can write to us directly at
      <a href="mailto:contact@neurofly.app">contact@neurofly.app</a>.</p>
    <p>Our mailbox is hosted by Apple (iCloud Mail); for people in the EEA, the UK and Switzerland, Apple Distribution
      International Ltd., Ireland, is responsible. Apple may store data in the USA and other countries and protects such transfers
      with the European Commission’s standard contractual clauses.</p>
    <p>We keep messages and submissions for as long as they are needed for the purposes described here, including the documentation
      and further development of the project, and beyond that where statutory retention duties or our legitimate interests,
      in particular the establishment, exercise or defence of legal claims, require it. Suggestions and corrections may be used and
      published under the <a href="terms.html#submissions">terms of use</a>; we may name their authors when crediting a
      contribution. If you do not want to be named, please say so in your message.</p>

    <h2 id="software">5. The NeuroFly software</h2>
    <p>NeuroFly for Windows runs on your computer. The current version (2.2) contains no telemetry, crash reporting, update check,
      advertising or account, and sends no data to us. Links to scientific publications in the application open in your web browser,
      and only when you click them.</p>
    <p>The application keeps your interface settings (for example language and panel choices) in its own local storage on your
      device. Recordings and exports are written only where you save them. Deleting those files, or uninstalling the application
      and its data folder, removes them. Do not place other people’s personal or confidential data in experiment notes unless you
      are entitled to.</p>

    <h2 id="social">6. Our profiles on social networks</h2>
    <p>NeuroFly has profiles on Instagram, TikTok and X. This website only links to them; it embeds no content, buttons or
      plugins from these platforms, so viewing our pages sends no data to them. When you open or interact with one of our
      profiles, the platform processes your data under its own responsibility and privacy policy
      (<a href="https://privacycenter.instagram.com/policy">Instagram</a>, <a href="https://www.tiktok.com/legal/privacy-policy-eea">TikTok</a>,
      <a href="https://x.com/privacy">X</a>); we have no influence on that processing.</p>
    <p>The platforms may give us aggregated statistics about the use of our profiles, such as reach and interactions. Where the
      law makes us jointly responsible with a platform for such processing, the platform’s arrangements for joint responsibility
      apply, and requests concerning your rights are best addressed to the platform, which alone has access to the data. If you
      send us a message or comment through a platform, we process it to answer you and to interact with our audience, based on
      our legitimate interest (GDPR Art. 6(1)(f)).</p>

    <h2 id="transfers">7. Service providers abroad</h2>
    <p>Some of the providers named above process data outside Switzerland and the EU, mainly in the USA:</p>
    <ul>
      <li><b>GitHub</b> (hosting and downloads): certified under the EU–U.S. and the Swiss–U.S. Data Privacy Framework; GitHub also uses the
        European Commission’s standard contractual clauses.</li>
      <li><b>Apple</b> (mailbox): standard contractual clauses.</li>
      <li><b>Cloudflare</b> (website infrastructure, statistics and download counter): certified under the EU–U.S. and the
        Swiss–U.S. Data Privacy Framework.</li>
      <li><b>Stripe</b> (donations): certified under the EU–U.S. and the Swiss–U.S. Data Privacy Framework; Stripe also uses the
        European Commission’s standard contractual clauses.</li>
      <li><b>Rybbit</b> (statistics, only with consent): stores statistics in the EU; for providers outside the EEA, Rybbit states
        that it uses standard contractual clauses or other recognised mechanisms.</li>
      <li><b>Airform</b> (forms): runs on infrastructure in the USA. Your message passes through it only if you use a form; you can
        email us directly instead.</li>
    </ul>

    <h2 id="security">8. Security</h2>
    <p>We take technical and organisational measures that we consider appropriate to protect personal data; the website is served
      over encrypted connections (HTTPS). No transmission over the internet and no storage system is completely secure, and we
      cannot guarantee the security of data you send to us; you do so at your own risk. Please report a suspected security problem
      to <a href="mailto:contact@neurofly.app">contact@neurofly.app</a>.</p>

    <h2 id="rights">9. Your rights</h2>
    <p>Within the limits of the applicable law you can ask what data we hold about you, have it corrected or deleted, object to its
      processing or ask us to restrict it, and, where the GDPR applies, receive it in a portable format and withdraw consent with
      effect for the future. Write to <a href="mailto:contact@neurofly.app">contact@neurofly.app</a>; we may ask for information
      needed to confirm that a request comes from you, and we may restrict, defer or refuse a request to the extent the law
      permits. You may also complain to a supervisory authority: in Switzerland the Federal
      Data Protection and Information Commissioner (FDPIC), in the EU the authority of your country.</p>

    <h2 id="children">10. Children</h2>
    <p>This website and the software are made for researchers, educators, students and interested adults. They are not directed at
      children under 13, and we do not knowingly collect data from them. If you believe a child has sent us personal data, please
      tell us.</p>

    <h2 id="changes">11. Changes</h2>
    <p>We may amend this privacy notice at any time without prior notice. The version published on this page applies.</p>
"""
page('privacy.html', 'Privacy notice', 'How NeuroFly handles personal data on neurofly.app, in messages and in the NeuroFly software.',
     'Legal', 'Privacy notice', 'What we process, why, and your choices.', section(privacy))

# ---- cookies ---------------------------------------------------------------------------------
cookies = f"""
    <p class="small">Effective {PRIVACY_UPDATED}. This page adds detail to the <a href="privacy.html">privacy notice</a>.</p>
    <h2>Cookies and similar technologies</h2>
    <p>Like most websites, neurofly.app keeps a few small entries in your browser. We store them in the browser’s local storage
      rather than in classic HTTP cookies, but they serve the same purpose, so we call them cookies here. Our own usage
      measurement (see the <a href="privacy.html#overview">privacy notice</a>) stores nothing in your browser. We use two categories:</p>
    <h3>Necessary</h3>
    <p>Needed for the website to work as you chose. Always on.</p>
    <div class="table-wrap">
      <table class="spec legal-table">
        <thead><tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>neurofly-consent</code></td><td>neurofly.app</td><td>Stores your cookie choice and when you made it</td>
            <td>12 months, then we ask again</td></tr>
        </tbody>
      </table>
    </div>
    <h3>Statistics</h3>
    <p>Optional, only with your consent. We use Rybbit (rybbit.com) to see which pages are read and how visitors find the site.
      Rybbit stores the statistics on servers in the EU and keeps them for three years; see the
      <a href="privacy.html#statistics">privacy notice</a>.</p>
    <div class="table-wrap">
      <table class="spec legal-table">
        <thead><tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>rybbit-visitor-id</code></td><td>Rybbit</td><td>A random ID, so that a repeat visit is counted as one visitor</td>
            <td>Until you withdraw consent or clear your browser data</td></tr>
        </tbody>
      </table>
    </div>
    <h2>Your choice</h2>
    <p>On your first visit we ask whether you accept all cookies or only the necessary ones. Your current setting on this browser:
      statistics <b data-consent-state>not yet chosen</b>.</p>
    <p><button type="button" class="btn secondary" data-privacy-settings>Privacy settings</button></p>
    <p>You can change or withdraw your consent there at any time; if you withdraw it, the statistics ID is deleted from your browser.
      You can also delete stored entries in your browser’s settings.</p>
"""
page('cookies.html', 'Cookies', 'Which cookies and similar technologies neurofly.app uses, and how to change your choice.', 'Legal',
     'Cookies', '', section(cookies))

# ---- terms of use --------------------------------------------------------------------------
terms = f"""
    <p class="small">Effective {TERMS_UPDATED}.</p>
    <p>These terms of use (“terms”) govern your access to and use of neurofly.app and its content (the “website”), operated by
      NeuroFly, Zurich, Switzerland (“NeuroFly”, “we”, “us”; see the <a href="imprint.html">imprint</a>). By accessing or using the
      website you accept these terms. If you do not accept them, do not use the website. The NeuroFly application is governed by
      the separate <a href="software-terms.html">software terms</a>.</p>

    <h2>1. The website</h2>
    <p>The website provides information about NeuroFly, an independent research and teaching project, free of charge. Plans,
      roadmap items and announcements describe current intentions only and create no obligation. We may change, suspend, restrict
      or discontinue the website or any part of it at any time, without notice and without giving reasons.</p>

    <h2>2. Information only; no professional advice</h2>
    <p>All content is provided for general information only. It is not scientific, medical, veterinary, legal or other professional
      advice and must not be relied on as such. NeuroFly combines measured connectome data with modelled neural, sensory and body
      dynamics; its results are model output, not observations of a living animal, and are not validated for any particular
      purpose. Any use of, or reliance on, the content is solely at your own risk and responsibility.</p>

    <h2>3. No warranty</h2>
    <p>To the maximum extent permitted by applicable law, the website and all content, films, figures, data and links are provided
      “as is” and “as available”, without any warranty or representation of any kind, whether express, implied or statutory,
      including any warranty of accuracy, completeness, timeliness, availability, freedom from errors or harmful components,
      fitness for a particular purpose or non-infringement.</p>

    <h2 id="liability">4. Limitation of liability</h2>
    <p>To the maximum extent permitted by applicable law, NeuroFly, its operators, contributors and service providers exclude all
      liability for any loss or damage of any kind, whether direct, indirect, incidental, consequential, special or punitive,
      including loss of data, research results, profits, revenue, goodwill or business opportunities, arising out of or in
      connection with the website, its content, its unavailability, linked websites, communications with us or these terms,
      whatever the legal basis (contract, tort, statute or otherwise), even if we were advised of the possibility of such damage.
      Where liability cannot be excluded entirely, our total aggregate liability is limited to CHF 100.</p>

    <h2>5. Acceptable use</h2>
    <p>You may use the website only lawfully and in accordance with these terms. You must not interfere with its operation or
      security, access it by automated means in a way that burdens it, attempt to gain unauthorised access to any system, or
      suggest an affiliation with or endorsement by NeuroFly that does not exist.</p>

    <h2>6. Intellectual property</h2>
    <p>The website and its original content, including text, figures, films, soundtracks, design, the NeuroFly name and logo, are
      protected and belong to NeuroFly or its licensors. All rights not expressly granted are reserved. Material that is expressly
      published under a licence (such as the NeuroFly code licence or a Creative Commons licence) may be used under that licence;
      third-party data and publications remain subject to their own licences. Naming a study, dataset or institution does not imply
      affiliation or endorsement.</p>

    <h2 id="submissions">7. Suggestions, corrections and other submissions</h2>
    <p>Anything you send us, whether through a form, by email or otherwise, including suggestions, corrections, ideas, code, data,
      text and images (“submissions”), is non-confidential and unsolicited. By sending a submission you grant NeuroFly a worldwide,
      royalty-free, perpetual, irrevocable, transferable and sublicensable licence to use, copy, modify, adapt, combine, publish,
      distribute and otherwise exploit it, in whole or in part, in any form and for any purpose, without attribution and without
      compensation. To the extent permitted by law, you waive, or agree not to assert, any moral rights in submissions. We are not
      obliged to review, answer, use, credit or keep any submission. You confirm that you are entitled to grant these rights and
      that your submission does not infringe the rights of others or contain confidential information or unlawful content.</p>

    <h2>8. Third-party websites and services</h2>
    <p>Links to third-party websites and services are provided for convenience only. We have no control over them and accept no
      responsibility for their content, availability, terms or data practices. Accessing them is at your own risk.</p>

    <h2>9. Indemnity</h2>
    <p>You agree to indemnify and hold harmless NeuroFly, its operators and contributors from and against all claims, losses,
      damages, liabilities, costs and expenses, including reasonable legal fees, arising out of or in connection with your use of
      the website, your submissions or your breach of these terms or of applicable law.</p>

    <h2>10. Changes to these terms</h2>
    <p>We may amend these terms at any time by publishing a new version on this page. The version published at the time of your use
      applies. Continued use of the website after a change constitutes acceptance of the amended terms.</p>

    <h2>11. Governing law and exclusive jurisdiction</h2>
    <p>These terms and all disputes arising out of or in connection with the website or these terms are governed exclusively by
      the substantive law of Switzerland, excluding its conflict-of-laws rules and the United Nations Convention on Contracts for
      the International Sale of Goods (CISG). The exclusive place of jurisdiction is Zurich, Switzerland. NeuroFly may also bring
      proceedings against you before the courts of your domicile or seat.</p>

    <h2>12. General</h2>
    <p>If any provision of these terms is or becomes invalid or unenforceable, the remaining provisions remain in effect, and the
      provision concerned shall be replaced by a valid provision that comes closest to its intended purpose. Our failure to enforce
      a provision is not a waiver of it. We may transfer our rights and obligations under these terms. These terms are the entire
      agreement between you and us regarding the website. The English version is authoritative.</p>

    <h2 id="donations">13. Donations</h2>
    <p>Donations to NeuroFly are voluntary gifts. They are not payment for goods, services, content or rights and create no claim
      against NeuroFly, in particular not to any feature, release, update, support or availability of the website or the software,
      nor to a particular use of the funds; NeuroFly decides on their use at its sole discretion. NeuroFly is not a registered
      charity: donations are not tax-deductible and no receipts for tax purposes are issued. Donations are non-refundable, except
      where mandatory law requires otherwise or in the case of an obvious error reported to us within 14 days. Payments are
      processed by Stripe under its own terms; NeuroFly is not responsible for the payment service. A monthly donation can be
      ended at any time with effect for the future by writing to <a href="mailto:contact@neurofly.app">contact@neurofly.app</a>.</p>
"""
page('terms.html', 'Terms of use', 'Terms of use of the NeuroFly website.', 'Legal', 'Terms of use', '', section(terms))

# ---- software terms ------------------------------------------------------------------------
software = f"""
    <p class="small">Effective {UPDATED}. Applies to NeuroFly 2.1.0 and all later releases.</p>

    <p>These software terms (“terms”) govern the NeuroFly application for Windows, its installer, documentation and bundled data
      (the “software”) as distributed by NeuroFly, Zurich, Switzerland (“NeuroFly”, “we”, “us”; see the
      <a href="imprint.html">imprint</a>). By downloading, installing or using the software you accept these terms. If you do not
      accept them, do not download, install or use the software.</p>

    <h2>1. The software</h2>
    <p>NeuroFly is an experimental simulation and teaching tool. It simulates a fruit fly on measured connectome data with modelled
      neural dynamics, senses and body. It is provided free of charge, in its current state, for experimental, research and teaching
      use, and is distributed as downloads through GitHub (<a href="https://github.com/neuroflyapp/neurofly/releases">github.com/neuroflyapp/neurofly</a>). We may change, suspend or stop distributing the software, or any version or feature of it, at any time without notice.</p>

    <h2>2. Licences of code and data</h2>
    <p>The NeuroFly program code is licensed under the <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm
      Noncommercial License 1.0.0</a>, which permits non-commercial use only; any commercial use requires a separate written
      licence from NeuroFly. Third-party components are licensed under their own licences; the licence texts and notices are
      included with the software. The datasets remain subject to their licences: FlyWire FAFB v783 under CC BY-NC 4.0
      (non-commercial use only), MaleCNS v1.0 and BANC v888 under CC BY 4.0. Where such a licence grants you rights in the material
      it covers, that licence applies to that material; these terms apply in addition. No rights in the NeuroFly name or logo are
      granted. You are solely responsible for complying with all licences that apply to your use.</p>

    <h2>3. Your responsibility</h2>
    <p>You use the software at your own risk and are solely responsible for its installation and use, for your computer system, for
      backing up your data, and for any conclusions you draw from, or decisions you base on, its output. Simulated output is model
      output, not an observation of a living animal. Pharmacology settings scale simulated transmitter classes and say nothing about
      the effect, safety or dose of any substance. The software provides no medical, veterinary, scientific or other professional
      advice and must not be used for diagnosis, treatment, regulatory submissions, safety-critical purposes or any purpose in
      which an error could cause harm to people, animals or property.</p>

    <h2>4. No support or updates</h2>
    <p>We have no obligation to provide support, maintenance, corrections, updates or new versions. Any we provide are voluntary,
      may be discontinued at any time and are governed by these terms.</p>

    <h2>5. No warranty</h2>
    <p>To the maximum extent permitted by applicable law, the software is provided “as is” and “as available”, with all faults and
      without any warranty or representation of any kind, whether express, implied or statutory, including any warranty of
      correctness, scientific validity, reliability, availability, compatibility, security, freedom from errors or harmful
      components, merchantability, fitness for a particular purpose or non-infringement.</p>

    <h2>6. Limitation of liability</h2>
    <p>To the maximum extent permitted by applicable law, NeuroFly, its operators, contributors and licensors exclude all liability
      for any loss or damage of any kind, whether direct, indirect, incidental, consequential, special or punitive, including loss
      or corruption of data, damage to computer systems, loss of research results, profits, revenue or goodwill, and business
      interruption, arising out of or in connection with the downloading, installation, use of or inability to use the software or
      its output, whatever the legal basis (contract, tort, statute or otherwise), even if we were advised of the possibility of
      such damage. Where liability cannot be excluded entirely, our total aggregate liability is limited to CHF 100.</p>

    <h2>7. Indemnity</h2>
    <p>You agree to indemnify and hold harmless NeuroFly, its operators, contributors and licensors from and against all claims,
      losses, damages, liabilities, costs and expenses, including reasonable legal fees, arising out of or in connection with your
      use of the software or its output, your breach of these terms or of any licence, or your violation of applicable law or the
      rights of others.</p>

    <h2>8. Feedback</h2>
    <p>Reports, suggestions and other submissions about the software are governed by the
      <a href="terms.html#submissions">submissions clause</a> of the terms of use.</p>

    <h2>9. Changes to these terms</h2>
    <p>We may amend these terms at any time by publishing a new version on this page. The version published at the time of your
      download or use applies. Continued use of the software after a change constitutes acceptance of the amended terms.</p>

    <h2>10. Governing law and exclusive jurisdiction</h2>
    <p>These terms and all disputes arising out of or in connection with the software or these terms are governed exclusively by
      the substantive law of Switzerland, excluding its conflict-of-laws rules and the United Nations Convention on Contracts for
      the International Sale of Goods (CISG). The exclusive place of jurisdiction is Zurich, Switzerland. NeuroFly may also bring
      proceedings against you before the courts of your domicile or seat.</p>

    <h2>11. General</h2>
    <p>If any provision of these terms is or becomes invalid or unenforceable, the remaining provisions remain in effect, and the
      provision concerned shall be replaced by a valid provision that comes closest to its intended purpose. Our failure to enforce
      a provision is not a waiver of it. We may transfer our rights and obligations under these terms. The English version is
      authoritative.</p>
"""
page('software-terms.html', 'Software terms', 'Terms for downloading and using the NeuroFly application for Windows.',
     'Legal', 'Software terms', 'For downloading and using NeuroFly for Windows.', section(software))

# ---- legal hub with licences & credits ---------------------------------------------------
hub = f"""
<section class="block">
  <div class="wrap">
    <div class="grid legal-hub">
      <a class="card link-card" href="imprint.html"><h3>Imprint</h3><p>Who runs NeuroFly and how to reach us.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="privacy.html" id="privacy"><h3>Privacy notice</h3><p>What we process, why, and your rights.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="cookies.html"><h3>Cookies</h3><p>What we store in your browser, and your settings.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="terms.html"><h3>Terms of use</h3><p>How the website may be used, and its scientific scope.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="software-terms.html"><h3>Software terms</h3><p>For downloading and using the Windows application.</p><span class="more">Read →</span></a>
    </div>
    <p class="small" id="imprint" style="margin-top:18px">Operator: NeuroFly, Zurich, Switzerland ·
      <a href="mailto:contact@neurofly.app">contact@neurofly.app</a></p>
  </div>
</section>
{section('''
    <h2>Licences &amp; credits</h2>
    <h3>Connectome data</h3>
    <ul>
      <li><b>FlyWire FAFB v783</b> — adult female brain; the brain circuit of the running model. Dorkenwald S, et al., <i>Nature</i>
        634, 124–138 (2024); Schlegel P, et al., <i>Nature</i> 634, 139–152 (2024). Licence:
        <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. NeuroFly selects a subgraph, adds cell-type
        annotations and derives signed synapse-count weights.</li>
      <li><b>MaleCNS v1.0</b> — adult male brain and nerve cord; the locomotor circuit of the running model and the anatomy
        explorer. FlyEM, HHMI Janelia, with the University of Cambridge, MRC Laboratory of Molecular Biology and Google Research;
        Berg S, et al., bioRxiv (2025). Licence: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. NeuroFly
        extracts a bounded leg circuit.</li>
      <li><b>BANC v888</b> — adult female brain and nerve cord; the anatomy explorer and the films on this site. Bates AS, Phelps JS,
        Kim M, et al., <i>Nature</i> 656, 957–970 (2026), <a href="https://doi.org/10.1038/s41586-026-10735-w">doi:10.1038/s41586-026-10735-w</a>;
        data <a href="https://doi.org/10.7910/DVN/7WTH1N">doi:10.7910/DVN/7WTH1N</a>. Licence:
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</li>
    </ul>
    <p>Because the FlyWire data may be used only non-commercially, NeuroFly is free of charge and carries no advertising.</p>
    <h3>Films and figures</h3>
    <p>The films and figures on this website are made by NeuroFly from the datasets above and from NeuroFly’s own simulation runs.
      Light in the films shows either spikes from a simulation run or an illustrative overlay, as stated beside each film; none of
      it is a recording from a living fly. Soundtracks are original compositions.</p>
    <h3>Software</h3>
    <p>NeuroFly’s code is licensed under the <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm
      Noncommercial License 1.0.0</a>: research, teaching and other non-commercial use are permitted; commercial use requires a
      licence from NeuroFly. The notices for third-party components are included with the software. This website uses no
      third-party code, fonts or frameworks; the optional page statistics come from Rybbit and load only with your consent.</p>
''', alt=True, id_='licences')}"""
page('legal.html', 'Legal', 'Imprint, privacy notice, cookies, terms, and licences & credits of NeuroFly.', 'Legal',
     'Legal', 'Everything in one place: who we are, how we handle data, and whose work NeuroFly builds on.', hub)

# ---- every page: no statistics tag in the head, one CSP, one footer ------------------------
for path in sorted(DOCS.glob('*.html')):
    s = path.read_text(encoding='utf-8')
    s = re.sub(r'\n<script src="https://app\.rybbit\.io/api/script\.js\?siteId=[0-9a-f]+" defer></script>', '', s)
    s = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">',
               f'<meta http-equiv="Content-Security-Policy" content="{CSP}">', s)
    s = re.sub(r'<footer class="site-footer">.*?</footer>', FOOTER, s, flags=re.S)
    path.write_text(s, encoding='utf-8')
print('legal pages built;', len(list(DOCS.glob('*.html'))), 'pages updated')
