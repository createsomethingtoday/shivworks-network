import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { getLatestModuleProgressForMember, listCourses, listSeries } from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/library');
	const db = getDBFromPlatform(platform);

	return {
		user,
		courses: await listCourses(db, user),
		series: await listSeries(db, user),
		resumeItem: await getLatestModuleProgressForMember(db, user)
	};
};
