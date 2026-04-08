import {
	createClerkClient,
	type ClerkClient,
	type User
} from '@clerk/backend';
import { verifyWebhook } from '@clerk/backend/webhooks';

export interface ClerkRuntimeEnv extends Record<string, string | undefined> {
	PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
	CLERK_SECRET_KEY?: string;
	CLERK_JWT_KEY?: string;
	CLERK_WEBHOOK_SIGNING_SECRET?: string;
	PUBLIC_SITE_URL?: string;
}

export function getClerkClient(env: ClerkRuntimeEnv): ClerkClient {
	if (!env.CLERK_SECRET_KEY) {
		throw new Error('CLERK_SECRET_KEY is not configured');
	}

	return createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY
	});
}

function normalizeJwtKey(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return value.replace(/\\n/g, '\n');
}

export async function authenticateClerkRequest(
	request: Request,
	env: ClerkRuntimeEnv
): Promise<App.Locals['auth']> {
	if (!env.CLERK_SECRET_KEY) {
		return {
			userId: null,
			sessionId: null,
			isAuthenticated: false
		};
	}

	try {
		const clerkClient = getClerkClient(env);
		const requestState = await clerkClient.authenticateRequest(request, {
			jwtKey: normalizeJwtKey(env.CLERK_JWT_KEY),
			authorizedParties: env.PUBLIC_SITE_URL ? [env.PUBLIC_SITE_URL] : undefined
		});
		const auth = requestState.toAuth();
		const userId = auth?.userId ?? null;
		const sessionId = auth?.sessionId ?? null;

		return {
			userId,
			sessionId,
			isAuthenticated: Boolean(userId)
		};
	} catch (error) {
		console.error('Clerk auth failed', error);
		return {
			userId: null,
			sessionId: null,
			isAuthenticated: false
		};
	}
}

export async function verifyClerkWebhook(
	request: Request,
	env: ClerkRuntimeEnv
) {
	return verifyWebhook(request, {
		signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET
	});
}

export function getPrimaryEmail(user: User): string {
	const primaryId = user.primaryEmailAddressId;
	return (
		user.emailAddresses.find((entry) => entry.id === primaryId)?.emailAddress ||
		user.emailAddresses[0]?.emailAddress ||
		''
	);
}

export function getDisplayName(user: User): string {
	const first = user.firstName?.trim();
	const last = user.lastName?.trim();
	const full = [first, last].filter(Boolean).join(' ').trim();
	return full || getPrimaryEmail(user) || 'Member';
}

export function isUserEmailVerified(user: User): boolean {
	const primaryId = user.primaryEmailAddressId;
	const primary = user.emailAddresses.find((entry) => entry.id === primaryId) || user.emailAddresses[0];
	return primary?.verification?.status === 'verified';
}
