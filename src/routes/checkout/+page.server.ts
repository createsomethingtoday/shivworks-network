import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAuthenticated } from '$lib/server/guards';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuthenticated(locals, '/checkout');

	if (user.accessStatus === 'active' && user.tier !== 'free') {
		redirect(302, sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard'));
	}

	return {
		user,
		redirectTo: sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard')
	};
};
