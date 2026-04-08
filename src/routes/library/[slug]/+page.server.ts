import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { canAccessAudience } from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getCourseBySlug,
	listCourseModules,
	listMemberModuleProgress
} from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, params, platform, url }) => {
	const redirectTarget = `/library/${params.slug}`;
	const user = requireEntitled(locals, redirectTarget);
	const db = getDBFromPlatform(platform);
	const course = await getCourseBySlug(db, params.slug);

	if (!course) {
		error(404, 'Course not found');
	}

	if (!canAccessAudience(user, course.accessTier)) {
		redirect(302, `/checkout?redirect=${encodeURIComponent(redirectTarget)}`);
	}

	const modules = await listCourseModules(db, course.id);
	const progressEntries = await listMemberModuleProgress(db, user.clerkUserId);
	const progressByModule = Object.fromEntries(
		progressEntries
			.filter((entry) => modules.some((module) => module.id === entry.moduleId))
			.map((entry) => [entry.moduleId, entry])
	);
	const requestedModuleId = url.searchParams.get('module');
	const selectedModule =
		modules.find((module) => module.id === requestedModuleId) ||
		modules.find((module) => module.status === 'available' && module.videoUrl) ||
		modules[0] ||
		null;

	return {
		user,
		course,
		modules,
		progressByModule,
		selectedModuleId: selectedModule?.id || null
	};
};
