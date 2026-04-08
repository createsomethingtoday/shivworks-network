import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getCourseModuleByIdMock,
	getDBFromPlatformMock,
	listContentReleaseNotificationRecipientsMock,
	resolveRuntimeEnvMock,
	sendContentReleaseEmailMock,
	updateCourseModuleMock
} = vi.hoisted(() => ({
	getCourseModuleByIdMock: vi.fn(),
	getDBFromPlatformMock: vi.fn(() => ({ kind: 'db' })),
	listContentReleaseNotificationRecipientsMock: vi.fn(),
	resolveRuntimeEnvMock: vi.fn(() => ({ RESEND_API_KEY: 'test' })),
	sendContentReleaseEmailMock: vi.fn(),
	updateCourseModuleMock: vi.fn()
}));

vi.mock('$lib/server/d1-compat', () => ({
	getDBFromPlatform: getDBFromPlatformMock
}));

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

vi.mock('$lib/server/env', () => ({
	resolveRuntimeEnv: resolveRuntimeEnvMock
}));

vi.mock('$lib/email', async () => {
	const actual = await vi.importActual<typeof import('$lib/email')>('$lib/email');
	return {
		...actual,
		sendContentReleaseEmail: sendContentReleaseEmailMock
	};
});

vi.mock('$lib/server/db/shivworks', async () => {
	const actual =
		await vi.importActual<typeof import('$lib/server/db/shivworks')>('$lib/server/db/shivworks');
	return {
		...actual,
		getCourseModuleById: getCourseModuleByIdMock,
		listContentReleaseNotificationRecipients: listContentReleaseNotificationRecipientsMock,
		updateCourseModule: updateCourseModuleMock
	};
});

import { actions } from './+page.server';

describe('admin module update action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getDBFromPlatformMock.mockReturnValue({ kind: 'db' });
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_origin',
			courseId: 'course_foundations',
			title: 'Origin Story',
			description: 'Original preview copy.',
			sortOrder: 1,
			status: 'coming_soon',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-free-preview.mp4',
			durationLabel: '06 min',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});
		listContentReleaseNotificationRecipientsMock.mockResolvedValue([
			{
				memberId: 'member_1',
				email: 'member1@example.com',
				name: 'Member One',
				tier: 'free',
				role: 'member'
			},
			{
				memberId: 'member_2',
				email: 'member2@example.com',
				name: 'Member Two',
				tier: 'bronze',
				role: 'member'
			}
		]);
	});

	it('sends release alerts when a module transitions to available', async () => {
		const formData = new FormData();
		formData.set('moduleId', 'module_origin');
		formData.set('title', 'Origin Story');
		formData.set('description', 'Now live for the free lane.');
		formData.set('status', 'available');
		formData.set('videoKind', 'mp4');
		formData.set('videoUrl', '/videos/shivworks-free-preview.mp4');
		formData.set('durationLabel', '06 min');
		formData.set('sendReleaseEmail', 'on');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(updateCourseModuleMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			expect.objectContaining({
				moduleId: 'module_origin',
				status: 'available'
			})
		);
		expect(listContentReleaseNotificationRecipientsMock).toHaveBeenCalledWith(
			{ kind: 'db' },
			'free'
		);
		expect(sendContentReleaseEmailMock).toHaveBeenCalledTimes(2);
		expect(result).toMatchObject({
			success: 'Course module updated and 2 release alert emails sent.'
		});
	});

	it('does not send release alerts when the module is already live', async () => {
		getCourseModuleByIdMock.mockResolvedValue({
			id: 'module_origin',
			courseId: 'course_foundations',
			title: 'Origin Story',
			description: 'Original preview copy.',
			sortOrder: 1,
			status: 'available',
			videoKind: 'mp4',
			videoUrl: '/videos/shivworks-free-preview.mp4',
			durationLabel: '06 min',
			courseSlug: 'shivworks-foundational-modules',
			courseTitle: 'ShivWorks Foundational Modules',
			courseAccessTier: 'free'
		});

		const formData = new FormData();
		formData.set('moduleId', 'module_origin');
		formData.set('title', 'Origin Story');
		formData.set('status', 'available');
		formData.set('videoKind', 'mp4');
		formData.set('sendReleaseEmail', 'on');

		const result = await actions.updateModule({
			request: { formData: async () => formData },
			locals: { user: { name: 'Admin' } },
			platform: { env: {} }
		} as never);

		expect(listContentReleaseNotificationRecipientsMock).not.toHaveBeenCalled();
		expect(sendContentReleaseEmailMock).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: 'Course module updated. Release alerts send only when a module moves live.'
		});
	});
});
