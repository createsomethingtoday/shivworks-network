import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import type { RequestHandler } from './$types';
import { activateMemberEntitlement, upsertMemberFromWebhook } from '$lib/server/db/shivworks';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { sendWelcomeEmail } from '$lib/email';
import { isPaidMembershipTier } from '$lib/constants/tiers';

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const stripeSecretKey = runtimeEnv.STRIPE_SECRET_KEY;
	const webhookSecret = runtimeEnv.STRIPE_WEBHOOK_SECRET;

	if (!stripeSecretKey || !webhookSecret) {
		return json({ success: false, error: 'Stripe webhook is not configured' }, { status: 500 });
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ success: false, error: 'Missing Stripe signature' }, { status: 400 });
	}

	const stripe = new Stripe(stripeSecretKey, {
		apiVersion: '2026-02-25.clover'
	});

	let event: Stripe.Event;

	try {
		const body = await request.text();
		event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
	} catch (error) {
		console.error('Stripe webhook verification failed', error);
		return json({ success: false, error: 'Invalid webhook signature' }, { status: 400 });
	}

	if (event.type !== 'checkout.session.completed') {
		return json({ success: true, ignored: true });
	}

	const session = event.data.object as Stripe.Checkout.Session;
	const clerkUserId = session.metadata?.clerkUserId;
	const tier = session.metadata?.tier;

	if (!clerkUserId || !isPaidMembershipTier(tier)) {
		return json({ success: false, error: 'Checkout metadata is incomplete' }, { status: 400 });
	}

	const db = getDBFromPlatform(platform);
	const email = session.customer_details?.email || session.customer_email || '';
	const name = session.customer_details?.name || 'Member';

	await upsertMemberFromWebhook(db, {
		clerkUserId,
		email,
		name,
		emailVerified: true
	});

	await activateMemberEntitlement(db, {
		clerkUserId,
		tier,
		sourceType: 'stripe',
		sourceRef: session.id
	});

	if (email) {
		await sendWelcomeEmail(runtimeEnv, {
			email,
			name,
			tier
		});
	}

	return json({ success: true });
};
