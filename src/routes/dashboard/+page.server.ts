import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	getLatestModuleProgressForMember,
	listCourses,
	listEvents,
	listExternalLinks,
	listRecentUpdates,
	listSeries
} from '$lib/server/db/shivworks';
import { requireEntitled } from '$lib/server/guards';
import { sortCoursesForDisplay } from '$lib/utils/course-order';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireEntitled(locals, '/dashboard');
	const db = getDBFromPlatform(platform);

	const [updates, courses, series, events, links, resumeItem] = await Promise.all([
		listRecentUpdates(db, user, 4),
		listCourses(db, user),
		listSeries(db, user),
		listEvents(db, user),
		listExternalLinks(db, user),
		getLatestModuleProgressForMember(db, user)
	]);

	const sortedCourses = sortCoursesForDisplay(courses);
	const courseCounts = {
		total: courses.length,
		available: courses.filter((course) => course.status === 'available').length,
		roadmap: courses.filter((course) => course.status === 'coming_soon').length,
		archived: courses.filter((course) => course.status === 'archived').length
	};

	return {
		user,
		updates,
		courses: sortedCourses.slice(0, 4),
		courseCounts,
		series,
		events: events.slice(0, 3),
		links,
		resumeItem
	};
};
