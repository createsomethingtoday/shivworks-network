import type { CourseRecord } from '$lib/server/db/shivworks';

function getCourseStatusWeight(status: CourseRecord['status']): number {
	switch (status) {
		case 'available':
			return 0;
		case 'coming_soon':
			return 1;
		case 'archived':
			return 2;
		default:
			return 3;
	}
}

export function sortCoursesForDisplay(courses: CourseRecord[]): CourseRecord[] {
	return [...courses].sort((left, right) => {
		const byStatus = getCourseStatusWeight(left.status) - getCourseStatusWeight(right.status);
		if (byStatus !== 0) {
			return byStatus;
		}

		const bySortOrder = left.sortOrder - right.sortOrder;
		if (bySortOrder !== 0) {
			return bySortOrder;
		}

		return left.title.localeCompare(right.title);
	});
}
