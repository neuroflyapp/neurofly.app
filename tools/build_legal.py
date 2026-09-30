"""Build the legal pages of the NeuroCause website and give every page the same
header, icons and footer.

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
- Donations: a one-time Stripe Payment Link in docs/index.html; visitors choose
  their amount at Stripe checkout. The support section works without JavaScript.
- Optional statistics: Microsoft Clarity (project ypl7e33gz2), loaded only
  after fresh consent. Heatmaps and masked session recordings are disclosed;
  ad storage is denied through Consent V2.
- Forms: Airform (airform.io, open source), served from Heroku behind
  Cloudflare.
- Mail: the contact address is hosted by Apple iCloud Mail (MX records);
  Apple uses standard contractual clauses for EEA/UK/CH transfers.
- Desktop app 2.2.0 (as 2.1.0): no network code; runtime test with all workspaces made
  0 network requests. UI preferences are kept in the app's own local storage;
  exports go only where the user saves them.
"""
import pathlib
import re

DOCS = pathlib.Path(__file__).resolve().parent.parent / 'docs'
UPDATED = '29 September 2026'
PRIVACY_UPDATED = '29 September 2026'
TERMS_UPDATED = '28 September 2026'     # terms of use: NeuroCause

# Who operates the site, where, and how to reach us. The domain switch to
# neuro-cause.com changes these two lines only (and docs/CNAME).
ORG = 'NeuroCause'
DOMAIN = 'neuro-cause.com'
EMAIL = 'contact@neuro-cause.com'
MAILTO = f'<a href="mailto:{EMAIL}">{EMAIL}</a>'

CSP = ("default-src 'self'; script-src 'self' https://*.clarity.ms https://c.bing.com; "
       "connect-src 'self' https://*.clarity.ms https://c.bing.com https://get.neurofly.app; "
       "img-src 'self' data: https://*.clarity.ms https://c.bing.com; media-src 'self'; "
       "style-src 'self' 'unsafe-inline'; form-action 'self' https://airform.io; "
       "base-uri 'self'; object-src 'none'")

FOOTER = """<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div><img src="brand/neurocause-logo.svg" alt="NeuroCause" width="139" height="26"><p>In-silico experiments on measured nervous systems. Our first model is the fruit fly <i>Drosophila melanogaster</i>. Independent research and teaching, from Zurich.</p>
        <ul class="social" aria-label="NeuroCause on social media"><li><a href="https://www.instagram.com/neurofly.app/" target="_blank" rel="me noopener" aria-label="NeuroCause on Instagram (opens in a new tab)" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none"/></svg></a></li><li><a href="https://www.tiktok.com/@neurofly" target="_blank" rel="me noopener" aria-label="NeuroCause on TikTok (opens in a new tab)" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a></li><li><a href="https://x.com/NeuroFlyApp" target="_blank" rel="me noopener" aria-label="NeuroCause on X (opens in a new tab)" title="X"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a></li><li><a href="https://github.com/neuroflyapp/neurofly" target="_blank" rel="me noopener" aria-label="NeuroCause on GitHub (opens in a new tab)" title="GitHub"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></a></li></ul></div>
      <div><h4>NeuroCause</h4><ul><li><a href="./#models">Models</a></li><li><a href="science.html">Methods</a></li><li><a href="evidence.html">Evidence</a></li><li><a href="vision.html">Vision &amp; roadmap</a></li><li><a href="ethics.html">Ethics</a></li><li><a href="https://github.com/neuroflyapp/neurofly">Source code</a></li></ul></div>
      <div><h4>Get involved</h4><ul><li><a href="./#support">Support the lab</a></li><li><a href="contact.html">Contact</a></li><li><a href="contact.html#suggest">Suggest an improvement</a></li><li><a href="contact.html#suggest">Report a scientific error</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="imprint.html">Imprint</a></li><li><a href="privacy.html">Privacy notice</a></li><li><a href="cookies.html">Cookies</a></li><li><a href="terms.html">Terms of use</a></li><li><button type="button" class="linklike" data-privacy-settings>Privacy settings</button></li></ul></div>
    </div>
    <p class="fine">Data: FlyWire FAFB v783 (CC BY-NC 4.0), MaleCNS v1.0 and BANC v888 (CC BY 4.0); see <a href="legal.html#licences">licences &amp; credits</a>.
      NeuroCause is not affiliated with or endorsed by the institutions that produced these datasets. Wiring and synapse counts are
      measured; neural dynamics, senses, body and behaviour are models, and NeuroCause makes no claim that any model feels anything.
      © 2026 NeuroCause.</p>
  </div>
</footer>"""

HEADER = """<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="./" aria-label="NeuroCause home"><img src="brand/neurocause-logo.svg" alt="NeuroCause" width="149" height="28"></a>
    <a class="mobile-support" href="./#support">Support</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <a href="./#models">Models</a>
      <a href="science.html">Methods</a>
      <a href="evidence.html">Evidence</a>
      <a href="paper.html">Paper</a>
      <a href="vision.html">Vision</a>
      <a href="ethics.html">Ethics</a>
      <a href="contact.html">Contact</a>
      <a href="./#support">Support</a>
      <a class="cta" href="./#get" data-track="nav-get">Download</a>
    </nav>
  </div>
</header>"""


def page(name, title, description, kicker, h1, lead, body, robots='index, follow'):
    # These notices are maintained in docs/ so their reviewed, more specific
    # analytics disclosures are not replaced by the older template below.
    if name in {'privacy.html', 'cookies.html'} and (DOCS / name).exists():
        return
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{title} — {ORG}</title>
<meta name="description" content="{description}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="https://{DOMAIN}/{name}">
<meta name="theme-color" content="#080c0d">
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="brand/neurocause-favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="brand/neurocause-icon-256.png">
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
page('imprint.html', 'Imprint', 'Imprint of the NeuroCause website and software.', 'Legal', 'Imprint', '', section(f"""
    <h2>Operator</h2>
    <p class="address">{ORG}<br>Zurich, Switzerland<br>Email: {MAILTO}</p>
    <p>{ORG} operates this website and publishes the {ORG} software. It is an independent, non-commercial research and teaching
      project that builds in-silico experiments on published connectomes. It is not affiliated with or endorsed by the
      institutions that produced the scientific datasets it uses. {ORG} was previously published under the name NeuroFly.</p>
    <p>Legal notices, questions about this website and requests concerning your personal data can be sent to the email address
      above.</p>

    <h2>Disclaimer</h2>
    <p>{ORG} assumes no liability whatsoever for the correctness, accuracy, timeliness, reliability or completeness of the
      information on this website. Liability claims against {ORG} for damage of a material or immaterial nature arising from
      access to, use or non-use of the published information, from misuse of the connection or from technical faults are
      excluded. All content is non-binding. {ORG} expressly reserves the right to change, supplement or delete parts of the
      website or the entire offering, or to suspend or end publication temporarily or permanently, without notice.</p>
    <p>References and links to third-party websites lie outside our area of responsibility. Any responsibility for such websites
      is declined. Accessing and using such websites is at the user’s own risk.</p>

    <h2>Copyright</h2>
    <p>The copyright and all other rights in the content, images, films, sound, design and other files on this website belong
      exclusively to {ORG} or the specifically named rights holders. Reproduction of any element requires the prior written
      consent of the rights holder, except where material is expressly published under a licence that permits it. The {ORG}
      program code is licensed under the PolyForm Noncommercial License 1.0.0; commercial use requires a separate licence from
      {ORG}. The scientific datasets keep their own licences: FlyWire FAFB v783 under CC BY-NC 4.0,
      MaleCNS v1.0 and BANC v888 under CC BY 4.0; see <a href="legal.html#licences">licences &amp; credits</a>. Naming a dataset or
      publication does not imply that its authors endorse {ORG}.</p>

    <h2>Related documents</h2>
    <p><a href="privacy.html">Privacy notice</a> · <a href="cookies.html">Cookies</a> · <a href="terms.html">Terms of
      use</a> · <a href="software-terms.html">Software terms</a></p>
    <p class="small">Last updated: {UPDATED}.</p>"""))

# ---- privacy notice ------------------------------------------------------------------------
privacy = f"""
    <p class="small">Effective {PRIVACY_UPDATED}.</p>
    <p>This notice explains which personal data {ORG} processes when you visit {DOMAIN}, write to us, or use the {ORG}
      software, why, and what you can do about it. It follows the Swiss Federal Act on Data Protection (FADP) and, where it
      applies to you, the EU General Data Protection Regulation (GDPR).</p>

    <h2 id="controller">1. Who is responsible</h2>
    <p>{ORG}, Zurich, Switzerland, {MAILTO}. See the
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
        <dt>Data</dt><dd>Page address and referral, device and browser information, approximate location, interactions on the page,
          heatmaps and masked session recordings. Clarity may set analytics cookies and similar identifiers.</dd>
        <dt>Purpose and basis</dt><dd>Understanding which pages are read, to improve them. Only with your consent (GDPR Art. 6(1)(a)),
          which you can withdraw at any time under <button type="button" class="linklike ink" data-privacy-settings>privacy settings</button>.</dd>
        <dt>Recipient</dt><dd>Microsoft Clarity (Microsoft Corporation). See section 3.</dd></dl></div>
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
      <div class="fact-item"><h3>When you download the {ORG} software</h3><dl>
        <dt>Data</dt><dd>IP address, time, the requested file, and the browser and network details that every download carries.
          For a download started on this website we record only the date and the file name, to count downloads; no IP address,
          cookie or other identifier is stored for this.</dd>
        <dt>Purpose and basis</dt><dd>Delivering the download and counting downloads; legitimate interest (GDPR Art. 6(1)(f)).</dd>
        <dt>Recipients</dt><dd>Cloudflare, which runs our download counter at get.neurofly.app and forwards you to the file, and
          GitHub (GitHub Releases), which serves the file under its own privacy statement.</dd></dl></div>
      <div class="fact-item"><h3>When you use the {ORG} software on your computer</h3><dl>
        <dt>Data</dt><dd>Your settings, simulation runs, recordings and exports.</dd>
        <dt>Purpose</dt><dd>Running the software on your device.</dd>
        <dt>Recipient</dt><dd>No one. The software sends nothing to us or to anyone else (section 5).</dd></dl></div>
    </div>
    <p>Fields marked as required on the forms are needed to process your request; without a return address we cannot reply.</p>

    <h2 id="statistics">3. Page statistics</h2>
    <p>In addition to our own measurement described in section 2, you can allow Microsoft Clarity. Its code is not loaded until
      you choose <em>Accept all</em> or enable statistics in the <button type="button" class="linklike ink"
      data-privacy-settings>privacy settings</button>. A previous choice for the former analytics provider is not reused.</p>
    <p>Clarity helps us inspect page usage through heatmaps and session recordings. It processes the information listed above;
      recordings mask sensitive content by default, and we also mask form fields. Do not enter confidential information elsewhere
      on the site. We tell Clarity that analytics storage is allowed only after your choice and that advertising storage is denied.
      See <a href="https://learn.microsoft.com/en-us/clarity/setup-and-installation/privacy-disclosure">Microsoft's Clarity
      privacy information</a> and <a href="https://privacy.microsoft.com/en-us/privacystatement">Microsoft's privacy statement</a>.</p>
    <p>Clarity can use cookies and similar identifiers to recognise visits. You may withdraw consent at any time under
      <button type="button" class="linklike ink" data-privacy-settings>privacy settings</button>. That stops further Clarity
      loading after a reload; you can clear previously stored cookies in your browser. Withdrawal does not erase information
      already processed. Microsoft may process data outside Switzerland and the EEA under its applicable transfer safeguards.</p>

    <h2 id="forms">4. Contact form, suggestions and email</h2>
    <p>The forms on the <a href="contact.html">contact page</a> are transmitted through Airform (airform.io), a form service that
      forwards submissions to our mailbox by email. Airform runs on the infrastructure of Heroku (Salesforce, USA) and Cloudflare
      (USA). Its own terms apply to its processing. Instead of using a form you can write to us directly at
      {MAILTO}.</p>
    <p>Our mailbox is hosted by Apple (iCloud Mail); for people in the EEA, the UK and Switzerland, Apple Distribution
      International Ltd., Ireland, is responsible. Apple may store data in the USA and other countries and protects such transfers
      with the European Commission’s standard contractual clauses.</p>
    <p>We keep messages and submissions for as long as they are needed for the purposes described here, including the documentation
      and further development of the project, and beyond that where statutory retention duties or our legitimate interests,
      in particular the establishment, exercise or defence of legal claims, require it. Suggestions and corrections may be used and
      published under the <a href="terms.html#submissions">terms of use</a>; we may name their authors when crediting a
      contribution. If you do not want to be named, please say so in your message.</p>

    <h2 id="software">5. The {ORG} software</h2>
    <p>The {ORG} software for Windows runs on your computer. The current version (2.2) contains no telemetry, crash reporting, update check,
      advertising or account, and sends no data to us. Links to scientific publications in the application open in your web browser,
      and only when you click them.</p>
    <p>The application keeps your interface settings (for example language and panel choices) in its own local storage on your
      device. Recordings and exports are written only where you save them. Deleting those files, or uninstalling the application
      and its data folder, removes them. Do not place other people’s personal or confidential data in experiment notes unless you
      are entitled to.</p>

    <h2 id="social">6. Our profiles on social networks</h2>
    <p>{ORG} has profiles on Instagram, TikTok and X. This website only links to them; it embeds no content, buttons or
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
      <li><b>Microsoft</b> (Clarity, only with consent): may process data outside Switzerland and the EEA under its applicable
        transfer safeguards; see Microsoft's privacy statement linked in section 3.</li>
      <li><b>Airform</b> (forms): runs on infrastructure in the USA. Your message passes through it only if you use a form; you can
        email us directly instead.</li>
    </ul>

    <h2 id="security">8. Security</h2>
    <p>We take technical and organisational measures that we consider appropriate to protect personal data; the website is served
      over encrypted connections (HTTPS). No transmission over the internet and no storage system is completely secure, and we
      cannot guarantee the security of data you send to us; you do so at your own risk. Please report a suspected security problem
      to {MAILTO}.</p>

    <h2 id="rights">9. Your rights</h2>
    <p>Within the limits of the applicable law you can ask what data we hold about you, have it corrected or deleted, object to its
      processing or ask us to restrict it, and, where the GDPR applies, receive it in a portable format and withdraw consent with
      effect for the future. Write to {MAILTO}; we may ask for information
      needed to confirm that a request comes from you, and we may restrict, defer or refuse a request to the extent the law
      permits. You may also complain to a supervisory authority: in Switzerland the Federal
      Data Protection and Information Commissioner (FDPIC), in the EU the authority of your country.</p>

    <h2 id="children">10. Children</h2>
    <p>This website and the software are made for researchers, educators and interested adults. They are not directed at
      children under 13, and we do not knowingly collect data from them. If you believe a child has sent us personal data, please
      tell us.</p>

    <h2 id="changes">11. Changes</h2>
    <p>We may amend this privacy notice at any time without prior notice. The version published on this page applies.</p>
"""
page('privacy.html', 'Privacy notice', f'How {ORG} handles personal data on {DOMAIN}, in messages and in the {ORG} software.',
     'Legal', 'Privacy notice', 'What we process, why, and your choices.', section(privacy))

# ---- cookies ---------------------------------------------------------------------------------
cookies = f"""
    <p class="small">Effective {PRIVACY_UPDATED}. This page adds detail to the <a href="privacy.html">privacy notice</a>.</p>
    <h2>Cookies and similar technologies</h2>
    <p>Like most websites, {DOMAIN} keeps a few small entries in your browser. We store them in the browser’s local storage
      rather than in classic HTTP cookies, but they serve the same purpose, so we call them cookies here. Our own usage
      measurement (see the <a href="privacy.html#overview">privacy notice</a>) stores nothing in your browser. We use two categories:</p>
    <h3>Necessary</h3>
    <p>Needed for the website to work as you chose. Always on.</p>
    <div class="table-wrap">
      <table class="spec legal-table">
        <thead><tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>neurofly-consent</code></td><td>{DOMAIN}</td><td>Stores your cookie choice and when you made it</td>
            <td>12 months, then we ask again</td></tr>
        </tbody>
      </table>
    </div>
    <h3>Statistics</h3>
    <p>Optional, only with your consent. Microsoft Clarity provides heatmaps and masked session recordings; see the
      <a href="privacy.html#statistics">privacy notice</a>.</p>
    <div class="table-wrap">
      <table class="spec legal-table">
        <thead><tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td><code>_clck</code>, <code>_clsk</code> and related Clarity storage</td><td>Microsoft Clarity</td>
            <td>Recognise visits and connect page interactions into sessions</td>
            <td>According to Microsoft's cookie policy, or until you clear browser data</td></tr>
        </tbody>
      </table>
    </div>
    <h2>Your choice</h2>
    <p>On your first visit we ask whether you accept all cookies or only the necessary ones. Your current setting on this browser:
      statistics <b data-consent-state>not yet chosen</b>.</p>
    <p><button type="button" class="btn secondary" data-privacy-settings>Privacy settings</button></p>
    <p>You can change or withdraw your consent there at any time; Clarity stops loading on later pages. To remove cookies already
      saved, clear this site's data in your browser settings.</p>
"""
page('cookies.html', 'Cookies', f'Which cookies and similar technologies {DOMAIN} uses, and how to change your choice.', 'Legal',
     'Cookies', '', section(cookies))

# ---- terms of use --------------------------------------------------------------------------
terms = f"""
    <p class="small">Effective {TERMS_UPDATED}.</p>
    <p>These terms of use (“terms”) govern your access to and use of {DOMAIN} and its content (the “website”), operated by
      {ORG}, Zurich, Switzerland (“{ORG}”, “we”, “us”; see the <a href="imprint.html">imprint</a>). By accessing or using the
      website you accept these terms. If you do not accept them, do not use the website. The {ORG} application is governed by
      the separate <a href="software-terms.html">software terms</a>.</p>

    <h2>1. The website</h2>
    <p>The website provides information about {ORG}, an independent research and teaching project, and its models, free of charge. Plans,
      roadmap items and announcements describe current intentions only and create no obligation. We may change, suspend, restrict
      or discontinue the website or any part of it at any time, without notice and without giving reasons.</p>

    <h2>2. Information only; no professional advice</h2>
    <p>All content is provided for general information only. It is not scientific, medical, veterinary, legal or other professional
      advice and must not be relied on as such. {ORG} models combine measured connectome data with modelled neural, sensory and
      body dynamics; their results are model output, not observations of a living animal, and are not validated for any particular
      purpose. Any use of, or reliance on, the content is solely at your own risk and responsibility.</p>

    <h2>3. No warranty</h2>
    <p>To the maximum extent permitted by applicable law, the website and all content, films, figures, data and links are provided
      “as is” and “as available”, without any warranty or representation of any kind, whether express, implied or statutory,
      including any warranty of accuracy, completeness, timeliness, availability, freedom from errors or harmful components,
      fitness for a particular purpose or non-infringement.</p>

    <h2 id="liability">4. Limitation of liability</h2>
    <p>To the maximum extent permitted by applicable law, {ORG}, its operators, contributors and service providers exclude all
      liability for any loss or damage of any kind, whether direct, indirect, incidental, consequential, special or punitive,
      including loss of data, research results, profits, revenue, goodwill or business opportunities, arising out of or in
      connection with the website, its content, its unavailability, linked websites, communications with us or these terms,
      whatever the legal basis (contract, tort, statute or otherwise), even if we were advised of the possibility of such damage.
      Where liability cannot be excluded entirely, our total aggregate liability is limited to CHF 100.</p>

    <h2>5. Acceptable use</h2>
    <p>You may use the website only lawfully and in accordance with these terms. You must not interfere with its operation or
      security, access it by automated means in a way that burdens it, attempt to gain unauthorised access to any system, or
      suggest an affiliation with or endorsement by {ORG} that does not exist.</p>

    <h2>6. Intellectual property</h2>
    <p>The website and its original content, including text, figures, films, soundtracks, design, the {ORG} name and logo, are
      protected and belong to {ORG} or its licensors. All rights not expressly granted are reserved. Material that is expressly
      published under a licence (such as the {ORG} code licence or a Creative Commons licence) may be used under that licence;
      third-party data and publications remain subject to their own licences. Naming a study, dataset or institution does not imply
      affiliation or endorsement.</p>

    <h2 id="submissions">7. Suggestions, corrections and other submissions</h2>
    <p>Anything you send us, whether through a form, by email or otherwise, including suggestions, corrections, ideas, code, data,
      text and images (“submissions”), is non-confidential and unsolicited. By sending a submission you grant {ORG} a worldwide,
      royalty-free, perpetual, irrevocable, transferable and sublicensable licence to use, copy, modify, adapt, combine, publish,
      distribute and otherwise exploit it, in whole or in part, in any form and for any purpose, without attribution and without
      compensation. To the extent permitted by law, you waive, or agree not to assert, any moral rights in submissions. We are not
      obliged to review, answer, use, credit or keep any submission. You confirm that you are entitled to grant these rights and
      that your submission does not infringe the rights of others or contain confidential information or unlawful content.</p>

    <h2>8. Third-party websites and services</h2>
    <p>Links to third-party websites and services are provided for convenience only. We have no control over them and accept no
      responsibility for their content, availability, terms or data practices. Accessing them is at your own risk.</p>

    <h2>9. Indemnity</h2>
    <p>You agree to indemnify and hold harmless {ORG}, its operators and contributors from and against all claims, losses,
      damages, liabilities, costs and expenses, including reasonable legal fees, arising out of or in connection with your use of
      the website, your submissions or your breach of these terms or of applicable law.</p>

    <h2>10. Changes to these terms</h2>
    <p>We may amend these terms at any time by publishing a new version on this page. The version published at the time of your use
      applies. Continued use of the website after a change constitutes acceptance of the amended terms.</p>

    <h2>11. Governing law and exclusive jurisdiction</h2>
    <p>These terms and all disputes arising out of or in connection with the website or these terms are governed exclusively by
      the substantive law of Switzerland, excluding its conflict-of-laws rules and the United Nations Convention on Contracts for
      the International Sale of Goods (CISG). The exclusive place of jurisdiction is Zurich, Switzerland. {ORG} may also bring
      proceedings against you before the courts of your domicile or seat.</p>

    <h2>12. General</h2>
    <p>If any provision of these terms is or becomes invalid or unenforceable, the remaining provisions remain in effect, and the
      provision concerned shall be replaced by a valid provision that comes closest to its intended purpose. Our failure to enforce
      a provision is not a waiver of it. We may transfer our rights and obligations under these terms. These terms are the entire
      agreement between you and us regarding the website. The English version is authoritative.</p>

    <h2 id="donations">13. Donations</h2>
    <p>Donations to {ORG} are voluntary gifts. They are not payment for goods, services, content or rights and create no claim
      against {ORG}, in particular not to any feature, release, update, support or availability of the website or the software,
      nor to a particular use of the funds; {ORG} decides on their use at its sole discretion. {ORG} is not a registered
      charity: donations are not tax-deductible and no receipts for tax purposes are issued. Donations are non-refundable, except
      where mandatory law requires otherwise or in the case of an obvious error reported to us within 14 days. Payments are
      processed by Stripe under its own terms; {ORG} is not responsible for the payment service. A monthly donation can be
      ended at any time with effect for the future by writing to {MAILTO}.</p>
"""
page('terms.html', 'Terms of use', f'Terms of use of the {ORG} website.', 'Legal', 'Terms of use', '', section(terms))

# ---- software terms ------------------------------------------------------------------------
software = f"""
    <p class="small">Effective {UPDATED}. Applies to release 2.1.0 and all later releases, including those published under the earlier name NeuroFly.</p>

    <p>These software terms (“terms”) govern the {ORG} application for Windows, its installer, documentation and bundled data
      (the “software”) as distributed by {ORG}, Zurich, Switzerland (“{ORG}”, “we”, “us”; see the
      <a href="imprint.html">imprint</a>). By downloading, installing or using the software you accept these terms. If you do not
      accept them, do not download, install or use the software.</p>

    <h2>1. The software</h2>
    <p>The software is an experimental simulation and teaching tool. It simulates a fruit fly on measured connectome data with modelled
      neural dynamics, senses and body. It is provided free of charge, in its current state, for experimental, research and teaching
      use, and is distributed as downloads through GitHub (<a href="https://github.com/neuroflyapp/neurofly/releases">github.com/neuroflyapp/neurofly</a>). We may change, suspend or stop distributing the software, or any version or feature of it, at any time without notice.</p>

    <h2>2. Licences of code and data</h2>
    <p>The {ORG} program code is licensed under the <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm
      Noncommercial License 1.0.0</a>, which permits non-commercial use only; any commercial use requires a separate written
      licence from {ORG}. Third-party components are licensed under their own licences; the licence texts and notices are
      included with the software. The datasets remain subject to their licences: FlyWire FAFB v783 under CC BY-NC 4.0
      (non-commercial use only), MaleCNS v1.0 and BANC v888 under CC BY 4.0. Where such a licence grants you rights in the material
      it covers, that licence applies to that material; these terms apply in addition. No rights in the {ORG} name or logo are
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
    <p>To the maximum extent permitted by applicable law, {ORG}, its operators, contributors and licensors exclude all liability
      for any loss or damage of any kind, whether direct, indirect, incidental, consequential, special or punitive, including loss
      or corruption of data, damage to computer systems, loss of research results, profits, revenue or goodwill, and business
      interruption, arising out of or in connection with the downloading, installation, use of or inability to use the software or
      its output, whatever the legal basis (contract, tort, statute or otherwise), even if we were advised of the possibility of
      such damage. Where liability cannot be excluded entirely, our total aggregate liability is limited to CHF 100.</p>

    <h2>7. Indemnity</h2>
    <p>You agree to indemnify and hold harmless {ORG}, its operators, contributors and licensors from and against all claims,
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
      the International Sale of Goods (CISG). The exclusive place of jurisdiction is Zurich, Switzerland. {ORG} may also bring
      proceedings against you before the courts of your domicile or seat.</p>

    <h2>11. General</h2>
    <p>If any provision of these terms is or becomes invalid or unenforceable, the remaining provisions remain in effect, and the
      provision concerned shall be replaced by a valid provision that comes closest to its intended purpose. Our failure to enforce
      a provision is not a waiver of it. We may transfer our rights and obligations under these terms. The English version is
      authoritative.</p>
"""
page('software-terms.html', 'Software terms', f'Terms for downloading and using the {ORG} application for Windows.',
     'Legal', 'Software terms', f'For downloading and using {ORG} for Windows.', section(software))

# ---- legal hub with licences & credits ---------------------------------------------------
hub = f"""
<section class="block">
  <div class="wrap">
    <div class="grid legal-hub">
      <a class="card link-card" href="imprint.html"><h3>Imprint</h3><p>Who runs {ORG} and how to reach us.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="privacy.html" id="privacy"><h3>Privacy notice</h3><p>What we process, why, and your rights.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="cookies.html"><h3>Cookies</h3><p>What we store in your browser, and your settings.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="terms.html"><h3>Terms of use</h3><p>How the website may be used, and its scientific scope.</p><span class="more">Read →</span></a>
      <a class="card link-card" href="software-terms.html"><h3>Software terms</h3><p>For downloading and using the Windows application.</p><span class="more">Read →</span></a>
    </div>
    <p class="small" id="imprint" style="margin-top:18px">Operator: {ORG}, Zurich, Switzerland ·
      {MAILTO}</p>
  </div>
</section>
{section(f'''
    <h2>Licences &amp; credits</h2>
    <h3>Connectome data</h3>
    <ul>
      <li><b>FlyWire FAFB v783</b> — adult female brain; the brain circuit of the running model. Dorkenwald S, et al., <i>Nature</i>
        634, 124–138 (2024); Schlegel P, et al., <i>Nature</i> 634, 139–152 (2024). Licence:
        <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>. The fly model selects a subgraph, adds cell-type
        annotations and derives signed synapse-count weights.</li>
      <li><b>MaleCNS v1.0</b> — adult male brain and nerve cord; the locomotor circuit of the running model and the anatomy
        explorer. FlyEM, HHMI Janelia, with the University of Cambridge, MRC Laboratory of Molecular Biology and Google Research;
        Berg S, et al., bioRxiv (2025). Licence: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. The fly model
        uses a bounded leg circuit extracted from it.</li>
      <li><b>BANC v888</b> — adult female brain and nerve cord; the anatomy explorer and the films on this site. Bates AS, Phelps JS,
        Kim M, et al., <i>Nature</i> 656, 957–970 (2026), <a href="https://doi.org/10.1038/s41586-026-10735-w">doi:10.1038/s41586-026-10735-w</a>;
        data <a href="https://doi.org/10.7910/DVN/7WTH1N">doi:10.7910/DVN/7WTH1N</a>. Licence:
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</li>
    </ul>
    <p>Because the FlyWire data may be used only non-commercially, {ORG} is free of charge and carries no advertising.</p>
    <h3>Films and figures</h3>
    <p>The films and figures on this website are made by {ORG} from the datasets above and from its own simulation runs.
      Light in the films shows either spikes from a simulation run or an illustrative overlay, as stated beside each film; none of
      it is a recording from a living fly. Soundtracks are original compositions.</p>
    <h3>Software</h3>
    <p>{ORG}’s code is licensed under the <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm
      Noncommercial License 1.0.0</a>: research, teaching and other non-commercial use are permitted; commercial use requires a
      licence from {ORG}. The notices for third-party components are included with the software. This website uses no
      third-party frameworks or fonts; optional Microsoft Clarity code loads only with your consent.</p>
''', alt=True, id_='licences')}"""
page('legal.html', 'Legal', f'Imprint, privacy notice, cookies, terms, and licences & credits of {ORG}.', 'Legal',
     'Legal', f'Everything in one place: who we are, how we handle data, and whose work {ORG} builds on.', hub)

# ---- every page: no statistics tag in the head, one CSP, one footer ------------------------
for path in sorted(DOCS.glob('*.html')):
    # The editorial paper has its own compact footer and active navigation;
    # do not replace either with the legal-page template.
    if path.name == 'paper.html':
        continue
    s = path.read_text(encoding='utf-8')
    s = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">',
               f'<meta http-equiv="Content-Security-Policy" content="{CSP}">', s)
    s = re.sub(r'<footer class="site-footer">.*?</footer>', lambda _: FOOTER, s, flags=re.S)
    s = re.sub(r'<a class="skip" href="#main">Skip to content</a>\n<header class="site-header">.*?</header>', lambda _: HEADER, s, flags=re.S)
    s = s.replace('brand/neurofly-favicon.ico', 'brand/neurocause-favicon.ico')
    s = s.replace('brand/neurofly-icon-180.png', 'brand/neurocause-icon-256.png')
    s = s.replace('<meta name="theme-color" content="#0c1311">', '<meta name="theme-color" content="#080c0d">')
    s = re.sub(r' — NeuroFly(</title>|">)', r' — NeuroCause\1', s)
    s = s.replace('https://neurofly.app/', f'https://{DOMAIN}/')
    s = s.replace('mailto:contact@neurofly.app">contact@neurofly.app', f'mailto:{EMAIL}">{EMAIL}')
    path.write_text(s, encoding='utf-8')
print('legal pages built;', len(list(DOCS.glob('*.html'))), 'pages updated')
