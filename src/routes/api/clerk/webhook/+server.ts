import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteMemberByClerkId, upsertMemberFromWebhook } from '$lib/server/db/shivworks';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { verifyClerkWebhook } from '$lib/server/clerk';

type ClerkUserEvent = {
	id: string;
	first_name?: string | null;
	last_name?: string | null;
	email_addresses?: Array<{
		email_address?: string | null;
		verification?: {
			status?: string | null;
		} | null;
	}>;
};

function getWebhookEmail(user: ClerkUserEvent): string {
	return user.email_addresses?.[0]?.email_address || '';
}

function getWebhookName(user: ClerkUserEvent): string {
	return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || getWebhookEmail(user) || 'Member';
}

function isWebhookVerified(user: ClerkUserEvent): boolean {
	return user.email_addresses?.[0]?.verification?.status === 'verified';
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	try {
		const event = await verifyClerkWebhook(request, runtimeEnv);
		const db = getDBFromPlatform(platform);

		switch (event.type) {
			case 'user.created':
			case 'user.updated': {
				const data = event.data as ClerkUserEvent;
				await upsertMemberFromWebhook(db, {
					clerkUserId: data.id,
					email: getWebhookEmail(data),
					name: getWebhookName(data),
					emailVerified: isWebhookVerified(data)
				});
				break;
			}
			case 'user.deleted': {
				const data = event.data as { id?: string | null };
				if (data.id) {
					await deleteMemberByClerkId(db, data.id);
				}
				break;
			}
			default:
				break;
		}

		return json({ success: true });
	} catch (error) {
		console.error('Clerk webhook failed', error);
		return json({ success: false, error: 'Clerk webhook failed' }, { status: 400 });
	}
};
