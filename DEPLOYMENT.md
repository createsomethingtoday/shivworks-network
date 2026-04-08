# ShivWorks Network Deployment

## Runtime

- App: Cloudflare Pages
- Database: Cloudflare D1 in production, Postgres or SQLite locally
- Auth: Clerk
- Payments: Stripe
- Community: Circle

## Required env

- `PUBLIC_SITE_URL`
- `PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BRONZE_PRICE_ID`
- `STRIPE_VIP_PRICE_ID`
- `RESEND_API_KEY`
- `SHIVWORKS_ADMIN_EMAILS`

## Local workflow

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

## Cloudflare

1. Create the `shivworks-network-db` D1 database.
2. Update `wrangler.jsonc` with the real database IDs and production domain vars.
3. Set Wrangler secrets for Clerk, Stripe, and Resend.
4. Configure Clerk webhooks to post to `/api/clerk/webhook`.
5. Configure Stripe webhooks to post to `/api/stripe/webhook`.

## Clerk

- Set the app domain to `network.shivworks.com`
- Enable email verification and forgot-password in Clerk
- Enable MFA in Clerk
- Add the webhook endpoint with `user.created`, `user.updated`, and `user.deleted`

## Stripe

- Create one-time prices for `bronze` and `vip`
- Set the price IDs in env
- Point checkout success back to `/welcome`
