# V56 account and monthly membership

Visitors can create an email/password account, sign in with a password or an existing owner-issued code, and choose to stay signed in. Passwords use individual random salts and scrypt. Authentication uses a Secure, HttpOnly, SameSite=Lax cookie: 30 days when remembered; a browser-session cookie with a 12-hour server expiry otherwise. Only the email is remembered in browser storage; passwords, codes and session tokens are never stored there. Owner administration still supports manual access grants.

## Enable monthly payments

Set these values privately in the hosting provider's server environment. Never put keys in public HTML, source-control files, or chat:

- `ARCHED_PUBLIC_URL`: the deployed HTTPS site origin.
- `STRIPE_SECRET_KEY`: Stripe's server-side secret key (start in test mode).
- `STRIPE_MONTHLY_PRICE_ID`: an active Stripe Price with recurring interval `month` and interval count 1. Create a product and a monthly price in Stripe Dashboard; copy its `price_...` ID. No amount is hardcoded by this site.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the endpoint below.
- `ARCHED_ADMIN_PASSWORD`: at least 16 characters for the existing owner administration.

In Stripe Dashboard, enable the customer portal (payment method updates and subscription cancellation), then register this webhook:

`https://YOUR-DOMAIN/.netlify/functions/access?action=stripe-webhook`

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and `invoice.payment_action_required`.

The app creates Checkout and Portal sessions for the authenticated account's stored Stripe customer. Customer identity and the monthly price come from the server, not form inputs. The return URL never grants access. Signed webhook events retrieve the current subscription from Stripe, validate its member metadata/customer/price, and update the paid-through date. Duplicate events are recorded; out-of-order notifications read current Stripe state. Cancellation at period end preserves access until that date; past-due/unpaid/canceled subscriptions do not receive paid access. Configure Stripe's retry/grace policy to match this behavior.

Run the test flow in Stripe test mode before switching keys, price, and webhook secret together to live mode. Existing manual grants remain available. This package has no configured Stripe account, price, or public deployment; it cannot collect live payments until those settings are supplied. The owner review HTML is a standalone preview, so it intentionally does not expose live account/billing controls.

Verification: `node server/verify_billing_v56.mjs`, `node server/verify_access_v49.mjs`, and `node server/verify_access_http_v49.mjs`. Billing tests use an injected fake Stripe transport and never send a real charge.
