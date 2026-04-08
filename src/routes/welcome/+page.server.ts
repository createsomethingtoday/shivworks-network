import type { PageServerLoad } from './$types';
import { requireAuthenticated } from '$lib/server/guards';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuthenticated(locals, '/welcome');
	return {
		user,
		ready: user.accessStatus === 'active',
		redirectTo: sanitizeInternalRedirect(url.searchParams.get('returnTo'), '/dashboard')
	};
};
