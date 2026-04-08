import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard');

	if (locals.user?.accessStatus === 'active') {
		redirect(302, redirectTo);
	}

	if (locals.auth.isAuthenticated && locals.user) {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	return { redirectTo };
};
