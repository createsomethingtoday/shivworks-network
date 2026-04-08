import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClerkClient } from '$lib/server/clerk';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { listActiveMemberSessions, revokeMemberSession } from '$lib/server/db/shivworks';
import { resolveRuntimeEnv } from '$lib/server/env';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user || !locals.auth.isAuthenticated) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const db = getDBFromPlatform(platform);
	const activeSessions = await listActiveMemberSessions(db, locals.user.clerkUserId);
	const target = activeSessions.find((session) => session.sessionId === params.sessionId);

	if (!target) {
		return json({ success: false, error: 'Session not found' }, { status: 404 });
	}

	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);
	const clerkClient = getClerkClient(runtimeEnv);

	await clerkClient.sessions.revokeSession(params.sessionId);
	await revokeMemberSession(db, locals.user.clerkUserId, params.sessionId, 'member_revoked');

	return json({ success: true });
};
