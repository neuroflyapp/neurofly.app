# Donations — live-link activation checklist

State (29 September 2026): the support section (`#support` on `docs/index.html`,
styles in `docs/assets/site.css`, logic at the end of `docs/assets/site.js`) and the
menu link "Support" are built but stay hidden while `CONFIG.donate` in
`docs/assets/site.js` has no links. The privacy notice (section 2, "When you donate",
and the transfers list) and the terms of use (§13 Donations) already cover it.

Provider: Stripe Payment Links. The website does not claim specific payment
methods or fees: these depend on the live account, payment method and checkout.

To switch on:

1. Finish Stripe's live-account activation and verify public branding is
   NeuroCause, website `https://neuro-cause.com`, support email
   `contact@neuro-cause.com` and the chosen statement descriptor. The account
   holder must provide required legal identity, payout and tax information.
2. Create live Payment Links for the desired CHF amounts. A single one-time
   "customer chooses what to pay" link is sufficient to launch; add recurring
   links only after checking their subscription terms and cancellation path.
   Prefer Stripe's hosted confirmation page. Do not infer payment success from
   a user-controlled URL parameter.
3. Put the links into `CONFIG.donate` (`url` of each amount, `onceOther`), check the
   exact live URLs and payment-method display locally, commit and push. The
   section and menu link appear only when at least one URL is configured.

Tax and legal classification should be checked for the account holder and
jurisdiction before accepting contributions. Never describe a payment as
tax-deductible unless that status has been established.
