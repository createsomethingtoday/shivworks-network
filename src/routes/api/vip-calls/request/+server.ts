import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createVipCallRequest } from '$lib/server/db/shivworks';
import { getDBFromPlatform } from '$lib/server/d1-compat';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user || locals.user.accessStatus !== 'active') {
		return json({ success: false, error: 'Member access required' }, { status: 403 });
	}

	if (locals.user.tier !== 'vip' && locals.user.role !== 'admin') {
		return json({ success: false, error: 'VIP access required' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		goals?: unknown;
		preferredMonth?: unknown;
		notes?: unknown;
	};

	const goals = typeof body.goals === 'string' ? body.goals.trim() : '';
	if (!goals) {
		return json({ success: false, error: 'Goals are required' }, { status: 400 });
	}

	const db = getDBFromPlatform(platform);
	const created = await createVipCallRequest(
		db,
		locals.user.clerkUserId,
		goals,
		typeof body.preferredMonth === 'string' ? body.preferredMonth.trim() || null : null,
		typeof body.notes === 'string' ? body.notes.trim() || null : null
	);

	if (!created) {
		return json(
			{
				success: false,
				error: 'You already have an open VIP request. Update that request after the team responds.'
			},
			{ status: 409 }
		);
	}

	return json({ success: true });
};
