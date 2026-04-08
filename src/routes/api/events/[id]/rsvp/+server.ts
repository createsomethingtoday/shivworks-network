import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getEventById, upsertEventRsvp } from '$lib/server/db/shivworks';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user || locals.user.accessStatus !== 'active') {
		return json({ success: false, error: 'Member access required' }, { status: 403 });
	}

	const db = getDBFromPlatform(platform);
	const event = await getEventById(db, params.id);
	if (!event) {
		return json({ success: false, error: 'Event not found' }, { status: 404 });
	}

	if (!canAccessAudience(locals.user, event.accessTier)) {
		return json({ success: false, error: 'That event requires a higher access level' }, { status: 403 });
	}

	await upsertEventRsvp(db, locals.user.clerkUserId, event.id, 'going');
	return json({ success: true });
};
