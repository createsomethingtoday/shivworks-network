import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageServerLoad } from './$types';

const {
	getCourseBySlugMock,
	getDBFromPlatformMock,
	listCourseModulesMock,
	listMemberModuleProgressMock
} = vi.hoisted(() => ({
	getCourseBySlugMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	listCourseModulesMock: vi.fn(),
	listMemberModuleProgressMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/db/shivworks', () => ({
	getCourseBySlug: getCourseBySlugMock,
	listCourseModules: listCourseModulesMock,
	listMemberModuleProgress: listMemberModuleProgressMock
}));

import { load } from './+page.server';

type CoursePageLoadResult = Exclude<Awaited<ReturnType<PageServerLoad>>, void>;

function createUser(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member',
		tier: 'free',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides
	};
}

describe('library course page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		listMemberModuleProgressMock.mockResolvedValue([]);
	});

	it('loads a free course and selects the first playable module by default', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-foundational-modules',
			title: 'ShivWorks Foundational Modules',
			description: 'Foundational preview.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'free'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_cap',
				courseId: 'course_foundations',
				title: 'Criminal Assault Paradigm',
				description: 'Conceptual foundation.',
				sortOrder: 2,
				status: 'coming_soon',
				videoKind: 'none',
				videoUrl: null,
				durationLabel: '08 min'
			},
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Preview module.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'mp4',
				videoUrl: '/videos/shivworks-free-preview.mp4',
				durationLabel: '06 min'
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'shivworks-foundational-modules' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-foundational-modules')
		} as never)) as CoursePageLoadResult;

		expect(result.course.slug).toBe('shivworks-foundational-modules');
		expect(result.selectedModuleId).toBe('module_origin');
		expect(result.progressByModule).toEqual({});
		expect(listCourseModulesMock).toHaveBeenCalledWith({ kind: 'db' }, 'course_foundations');
	});

	it('respects the requested module when it belongs to the course', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-foundational-modules',
			title: 'ShivWorks Foundational Modules',
			description: 'Foundational preview.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'free'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Preview module.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'mp4',
				videoUrl: '/videos/shivworks-free-preview.mp4',
				durationLabel: '06 min'
			},
			{
				id: 'module_cap',
				courseId: 'course_foundations',
				title: 'Criminal Assault Paradigm',
				description: 'Conceptual foundation.',
				sortOrder: 2,
				status: 'coming_soon',
				videoKind: 'none',
				videoUrl: null,
				durationLabel: '08 min'
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'shivworks-foundational-modules' },
			platform: { env: {} },
			url: new URL(
				'https://network.shivworks.com/library/shivworks-foundational-modules?module=module_cap'
			)
		} as never)) as CoursePageLoadResult;

		expect(result.selectedModuleId).toBe('module_cap');
	});

	it('returns saved progress for modules in the course', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_foundations',
			slug: 'shivworks-foundational-modules',
			title: 'ShivWorks Foundational Modules',
			description: 'Foundational preview.',
			status: 'available',
			sortOrder: 1,
			badgeText: 'Watch now',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'free'
		});
		listCourseModulesMock.mockResolvedValue([
			{
				id: 'module_origin',
				courseId: 'course_foundations',
				title: 'Origin Story',
				description: 'Preview module.',
				sortOrder: 1,
				status: 'available',
				videoKind: 'mp4',
				videoUrl: '/videos/shivworks-free-preview.mp4',
				durationLabel: '06 min'
			}
		]);
		listMemberModuleProgressMock.mockResolvedValue([
			{
				moduleId: 'module_origin',
				currentSeconds: 85,
				durationSeconds: 360,
				completedAt: null,
				updatedAt: Date.now()
			}
		]);

		const result = (await load({
			locals: {
				auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
				user: createUser()
			},
			params: { slug: 'shivworks-foundational-modules' },
			platform: { env: {} },
			url: new URL('https://network.shivworks.com/library/shivworks-foundational-modules')
		} as never)) as CoursePageLoadResult;

		expect(result.progressByModule.module_origin).toMatchObject({
			currentSeconds: 85,
			durationSeconds: 360
		});
	});

	it('redirects free users to checkout for paid member courses', async () => {
		getCourseBySlugMock.mockResolvedValue({
			id: 'course_core_skills',
			slug: 'shivworks-core-skills',
			title: 'ShivWorks Core Skills',
			description: 'Paid course.',
			status: 'available',
			sortOrder: 2,
			badgeText: 'Member video',
			artworkUrl: null,
			courseKind: 'course',
			accessTier: 'member'
		});
		listCourseModulesMock.mockResolvedValue([]);

		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: createUser()
				},
				params: { slug: 'shivworks-core-skills' },
				platform: { env: {} },
				url: new URL('https://network.shivworks.com/library/shivworks-core-skills')
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Flibrary%2Fshivworks-core-skills'
		});
	});
});
