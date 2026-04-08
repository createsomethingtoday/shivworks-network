import type { LayoutServerLoad } from './$types';
import { resolveRuntimeEnv } from '$lib/server/env';

export const load: LayoutServerLoad = async ({ locals, platform }) => {
	const runtimeEnv = resolveRuntimeEnv(
		(platform as { env?: Record<string, string | undefined> } | undefined)?.env
	);

	return {
		auth: locals.auth,
		user: locals.user,
		publicConfig: {
			clerkPublishableKey: runtimeEnv.PUBLIC_CLERK_PUBLISHABLE_KEY || null
		}
	};
};
