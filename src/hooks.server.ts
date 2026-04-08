import type { Handle } from '@sveltejs/kit';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { resolveRuntimeEnv } from '$lib/server/env';
import { authenticateClerkRequest, getClerkClient } from '$lib/server/clerk';
import { ensureMemberIdentity } from '$lib/server/db/shivworks';
import { syncAndEnforceSessionLimit } from '$lib/server/session-security';

export const handle: Handle = async ({ event, resolve }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(event.platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	event.locals.auth = {
		userId: null,
		sessionId: null,
		isAuthenticated: false
	};
	event.locals.user = null;

	const auth = await authenticateClerkRequest(event.request, runtimeEnv);
	event.locals.auth = auth;

	if (auth.userId) {
		try {
			const db = getDBFromPlatform(event.platform);
			const clerkClient = getClerkClient(runtimeEnv);

			const member = await ensureMemberIdentity(db, clerkClient, auth.userId);
			event.locals.user = member;

			if (auth.sessionId) {
				await syncAndEnforceSessionLimit({
					db,
					clerkClient,
					member,
					sessionId: auth.sessionId,
					request: event.request,
					runtimeEnv
				});
			}
		} catch (error) {
			console.error('Failed to hydrate authenticated ShivWorks member', error);
		}
	}

	return resolve(event);
};
