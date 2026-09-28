# Donations — paused, ready to switch on

State (26 September 2026): the support section (`#support` on `docs/index.html`,
styles in `docs/assets/site.css`, logic at the end of `docs/assets/site.js`) and the
menu link "Support" are built but stay hidden while `CONFIG.donate` in
`docs/assets/site.js` has no links. The privacy notice (section 2, "When you donate",
and the transfers list) and the terms of use (§13 Donations) already cover it.

Provider: Stripe Payment Links — no platform fee, TWINT, Apple Pay, Google Pay and
cards, one-time and monthly. (Givebutter needs a US bank account; platforms for
nonprofits only need a registered charity; Donorbox charges 2.95 %.)

To switch on:

1. Activate the live Stripe account (the account holder does this: company type,
   personal details, bank account, two-factor login). Public details: name
   "NeuroFly", website https://neurofly.app, support email contact@neurofly.app,
   statement descriptor NEUROFLY. Payment methods: switch on TWINT.
2. Create Payment Links in live mode: one-time CHF 10, 25, 50, 100; one where the
   donor chooses the amount; monthly CHF 5, 10, 25. In each link: after payment,
   redirect to `https://neurofly.app/?thanks=1#support`.
3. Put the links into `CONFIG.donate` (`url` of each amount, `onceOther`), check the
   section locally, commit and push. The section and the menu link appear by
   themselves.

Tax: whether donations to the account holder are taxable should be clarified with a
fiduciary before switching on.
