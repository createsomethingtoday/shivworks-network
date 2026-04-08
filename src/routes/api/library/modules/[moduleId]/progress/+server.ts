import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getCourseModuleById,
	upsertMemberModuleProgress
} from '$lib/server/db/shivworks';

function readProgressNumber(value: unknown): number | null {
	if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
		return null;
	}

	return value;
}

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user || locals.user.accessStatus !== 'active') {
		return json({ success: false, error: 'Member access required' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		currentSeconds?: unknown;
		durationSeconds?: unknown;
		completed?: unknown;
	};

	const currentSeconds = readProgressNumber(body.currentSeconds);
	const durationSeconds = body.durationSeconds === null ? null : readProgressNumber(body.durationSeconds);
	const completed = body.completed === true;

	if (currentSeconds === null) {
		return json({ success: false, error: 'A valid currentSeconds value is required.' }, { status: 400 });
	}

	if (body.durationSeconds !== undefined && body.durationSeconds !== null && durationSeconds === null) {
		return json({ success: false, error: 'durationSeconds must be a valid number.' }, { status: 400 });
	}

	const db = getDBFromPlatform(platform);
	const module = await getCourseModuleById(db, params.moduleId);

	if (!module) {
		return json({ success: false, error: 'Course module not found.' }, { status: 404 });
	}

	if (!canAccessAudience(locals.user, module.courseAccessTier)) {
		return json({ success: false, error: 'Upgrade required for this module.' }, { status: 403 });
	}

	await upsertMemberModuleProgress(db, {
		memberId: locals.user.clerkUserId,
		moduleId: module.id,
		currentSeconds,
		durationSeconds,
		completed
	});

	return json({ success: true });
};
