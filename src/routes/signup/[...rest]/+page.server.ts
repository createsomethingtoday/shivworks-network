import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { sanitizeInternalRedirect } from '$lib/utils/redirects';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = sanitizeInternalRedirect(url.searchParams.get('redirect'), '/dashboard');
	const provisionedEmail = (url.searchParams.get('email') || '').trim().toLowerCase();
	const provisioned = url.searchParams.get('provisioned') === '1';

	if (locals.user?.accessStatus === 'active') {
		redirect(302, redirectTo);
	}

	if (locals.auth.isAuthenticated && locals.user) {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTo)}`);
	}

	return {
		redirectTo,
		provisioned,
		provisionedEmail
	};
};
