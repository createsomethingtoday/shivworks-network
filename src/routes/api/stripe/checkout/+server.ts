import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { MEMBERSHIP_TIERS, isPaidMembershipTier } from '$lib/constants/tiers';
import { buildLoginHref, sanitizeInternalRedirect } from '$lib/utils/redirects';
import { resolveRuntimeEnv } from '$lib/server/env';

export const POST: RequestHandler = async ({ request, locals, url, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const body = (await request.json().catch(() => ({}))) as {
		tier?: unknown;
		returnTo?: unknown;
	};
	const returnTo = sanitizeInternalRedirect(
		typeof body.returnTo === 'string' ? body.returnTo : null,
		'/dashboard'
	);

	if (!locals.auth.isAuthenticated || !locals.user) {
		return json(
			{
				success: false,
				error: 'Please sign in before checkout',
				loginUrl: `${url.origin}${buildLoginHref(returnTo, '/checkout')}`
			},
			{ status: 401 }
		);
	}

	if (locals.user.accessStatus === 'active' && locals.user.tier !== 'free') {
		return json({ success: false, error: 'Membership is already active' }, { status: 400 });
	}

	const stripeSecretKey = runtimeEnv.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		return json({ success: false, error: 'Stripe is not configured' }, { status: 500 });
	}

	if (!isPaidMembershipTier(body.tier)) {
		return json({ success: false, error: 'A valid membership tier is required' }, { status: 400 });
	}

	const priceId =
		body.tier === 'bronze' ? runtimeEnv.STRIPE_BRONZE_PRICE_ID : runtimeEnv.STRIPE_VIP_PRICE_ID;
	if (!priceId) {
		return json(
			{
				success: false,
				error: `Stripe price is not configured for ${MEMBERSHIP_TIERS[body.tier].label}`
			},
			{ status: 500 }
		);
	}

	const stripe = new Stripe(stripeSecretKey, {
		apiVersion: '2026-02-25.clover'
	});

	const successUrl = new URL('/welcome', url.origin);
	successUrl.searchParams.set('returnTo', returnTo);
	successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

	const session = await stripe.checkout.sessions.create({
		mode: 'payment',
		line_items: [
			{
				price: priceId,
				quantity: 1
			}
		],
		customer_email: locals.user.email,
		success_url: successUrl.toString(),
		cancel_url: `${url.origin}/checkout?redirect=${encodeURIComponent(returnTo)}`,
		allow_promotion_codes: true,
		metadata: {
			clerkUserId: locals.user.clerkUserId,
			tier: body.tier,
			returnTo
		}
	});

	return json({
		success: true,
		data: {
			url: session.url,
			tier: body.tier
		}
	});
};
