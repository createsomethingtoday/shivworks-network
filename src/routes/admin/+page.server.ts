import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	isMemberTier,
	normalizeContentAudience,
	type AccessStatus,
	type ContentAudience,
	type MembershipTier
} from '$lib/constants/tiers';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import {
	type CourseModuleVideoKind,
	approveVipCallRequest,
	claimImportedMemberProvision,
	createExternalLink,
	createActivityUpdate,
	createEvent,
	getMemberByClerkId,
	getMemberByEmail,
	getCourseModuleById,
	getEventById,
	listContentReleaseNotificationRecipients,
	listImportedMemberProvisions,
	listAdminExternalLinks,
	listAdminMembers,
	listCourses,
	listCourseModules,
	listEventReminderRecipients,
	listUpdateNotificationRecipients,
	listEvents,
	listPendingVipCallRequests,
	listRecentUpdates,
	upsertImportedMemberProvision,
	updateCourseModule,
	updateCourseStatus,
	updateEvent,
	updateExternalLink,
	updateMemberTier
} from '$lib/server/db/shivworks';
import { requireAdmin } from '$lib/server/guards';
import {
	sendContentReleaseEmail,
	sendImportedMemberOnboardingEmail,
	sendLivestreamReminderEmail,
	sendUpdateNotificationEmail,
	sendVipBookingEmail
} from '$lib/email';
import { resolveRuntimeEnv } from '$lib/server/env';
import { parseImportedMemberCsv } from '$lib/server/member-imports';

function readText(data: FormData, key: string): string {
	return String(data.get(key) || '').trim();
}

function readOptionalText(data: FormData, key: string): string | null {
	return readText(data, key) || null;
}

function readSortOrder(data: FormData, key: string): number {
	const parsed = Number.parseInt(readText(data, key) || '0', 10);
	return Number.isNaN(parsed) ? 0 : parsed;
}

function readChecked(data: FormData, key: string): boolean {
	return data.get(key) !== null;
}

function readMembershipTier(data: FormData, key: string): MembershipTier | null {
	const value = data.get(key);
	return isMemberTier(value) ? value : null;
}

function readAccessStatus(data: FormData, key: string): AccessStatus {
	const value = data.get(key);
	return value === 'active' || value === 'revoked' ? value : 'none';
}

function readAudience(data: FormData, key: string): ContentAudience {
	return normalizeContentAudience(data.get(key));
}

function readExternalUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
	}

	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return null;
		}
		return parsed.toString();
	} catch {
		return null;
	}
}

function readMediaUrl(data: FormData, key: string): string | null {
	const raw = readText(data, key);
	if (!raw) {
		return null;
	}

	if (raw.startsWith('/')) {
		return raw;
	}

	return readExternalUrl(data, key);
}

function readCourseModuleVideoKind(data: FormData, key: string): CourseModuleVideoKind {
	const value = data.get(key);
	return value === 'mp4' || value === 'embed' ? value : 'none';
}

async function readCsvUpload(data: FormData): Promise<string> {
	const file = data.get('csvFile');
	if (file && typeof file === 'object' && 'text' in file && typeof file.text === 'function') {
		const text = await file.text();
		if (text.trim()) {
			return text.trim();
		}
	}

	return readText(data, 'csvData');
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireAdmin(locals);
	const db = getDBFromPlatform(platform);

	return {
		members: await listAdminMembers(db),
		imports: await listImportedMemberProvisions(db),
		courses: await listCourses(db),
		modules: await listCourseModules(db),
		updates: await listRecentUpdates(db, { ...locals.user!, tier: 'vip' }, 25),
		events: await listEvents(db, { ...locals.user!, tier: 'vip' }),
		links: await listAdminExternalLinks(db),
		vipRequests: await listPendingVipCallRequests(db)
	};
};

export const actions: Actions = {
	importMembers: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const data = await request.formData();
		const csvText = await readCsvUpload(data);

		if (!csvText) {
			return fail(400, { error: 'Upload a CSV file or paste CSV rows to import members.' });
		}

		const parsed = parseImportedMemberCsv(csvText);
		if (parsed.errors.length > 0) {
			return fail(400, { error: parsed.errors.join(' ') });
		}

		let claimedCount = 0;
		let emailedCount = 0;
		let queuedCount = 0;
		const warnings: string[] = [];
		const sendEmails = readChecked(data, 'sendOnboardingEmail');
		const sourceBatch = `admin-import-${Date.now()}`;

		for (const row of parsed.rows) {
			await upsertImportedMemberProvision(db, {
				...row,
				sourceRef: row.sourceRef || sourceBatch
			});

			const existingMember = await getMemberByEmail(db, row.email);
			if (existingMember) {
				await claimImportedMemberProvision(db, {
					clerkUserId: existingMember.clerkUserId,
					email: row.email,
					name: existingMember.name || row.name
				});
				claimedCount += 1;
				continue;
			}

			queuedCount += 1;

			if (!sendEmails) {
				continue;
			}

			try {
				await upsertImportedMemberProvision(db, {
					...row,
					sourceRef: row.sourceRef || sourceBatch,
					lastEmailedAt: Date.now()
				});
				await sendImportedMemberOnboardingEmail(runtimeEnv, {
					email: row.email,
					name: row.name,
					tier: row.tier
				});
				emailedCount += 1;
			} catch (error) {
				console.error('Failed to send imported member onboarding email', error);
				warnings.push(`Could not send onboarding email to ${row.email}.`);
			}
		}

		return {
			success: `${parsed.rows.length} member${parsed.rows.length === 1 ? '' : 's'} imported. ${claimedCount} claimed immediately, ${queuedCount} queued, ${emailedCount} onboarding email${emailedCount === 1 ? '' : 's'} sent.${warnings.length > 0 ? ` ${warnings.join(' ')}` : ''}`
		};
	},

	updateMember: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		await updateMemberTier(
			db,
			String(data.get('memberId')),
			readMembershipTier(data, 'tier'),
			readAccessStatus(data, 'accessStatus')
		);
		return { success: true };
	},

	updateCourse: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		await updateCourseStatus(
			db,
			String(data.get('courseId')),
			String(data.get('status')) as 'coming_soon' | 'available' | 'archived',
			(String(data.get('badgeText')) || '').trim() || null,
			readAudience(data, 'accessTier')
		);
		return { success: true };
	},

	updateModule: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const moduleId = readText(data, 'moduleId');
		const title = readText(data, 'title');
		const description = readOptionalText(data, 'description');
		const nextStatus =
			readText(data, 'status') === 'available'
				? 'available'
				: readText(data, 'status') === 'archived'
					? 'archived'
					: 'coming_soon';

		if (!moduleId || !title) {
			return fail(400, { error: 'Course modules require an id and title.' });
		}

		const existingModule = await getCourseModuleById(db, moduleId);
		if (!existingModule) {
			return fail(404, { error: 'Course module not found.' });
		}

		await updateCourseModule(db, {
			moduleId,
			title,
			description,
			status: nextStatus,
			videoKind: readCourseModuleVideoKind(data, 'videoKind'),
			videoUrl: readMediaUrl(data, 'videoUrl'),
			durationLabel: readOptionalText(data, 'durationLabel')
		});

		if (!readChecked(data, 'sendReleaseEmail')) {
			return { success: 'Course module updated.' };
		}

		const justPublished =
			existingModule.status !== 'available' && nextStatus === 'available';

		if (!justPublished) {
			return {
				success: 'Course module updated. Release alerts send only when a module moves live.'
			};
		}

		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const recipients = await listContentReleaseNotificationRecipients(
			db,
			existingModule.courseAccessTier
		);
		await Promise.all(
			recipients.map((recipient) =>
				sendContentReleaseEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					courseTitle: existingModule.courseTitle,
					courseSlug: existingModule.courseSlug,
					moduleTitle: title,
					description
				})
			)
		);

		return {
			success: `Course module updated and ${recipients.length} release alert email${recipients.length === 1 ? '' : 's'} sent.`
		};
	},

	createUpdate: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);
		const title = readText(data, 'title');
		const bodyMarkdown = readText(data, 'bodyMarkdown');
		const audience = readAudience(data, 'audience');

		if (!title || !bodyMarkdown) {
			return fail(400, { error: 'Title and update copy are required.' });
		}

		await createActivityUpdate(db, {
			title,
			bodyMarkdown,
			audience,
			authorName: locals.user?.name || 'Admin'
		});

		if (!readChecked(data, 'sendUpdateEmail')) {
			return { success: 'Update published.' };
		}

		const recipients = await listUpdateNotificationRecipients(db, audience);
		await Promise.all(
			recipients.map((recipient) =>
				sendUpdateNotificationEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					title,
					bodyMarkdown
				})
			)
		);

		return {
			success: `Update published and ${recipients.length} notification email${recipients.length === 1 ? '' : 's'} sent.`
		};
	},

	createEvent: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const title = readText(data, 'title');
		const description = readText(data, 'description');
		const startsAt = data.get('startsAt') ? Date.parse(String(data.get('startsAt'))) : null;
		const endsAt = data.get('endsAt') ? Date.parse(String(data.get('endsAt'))) : null;

		if (!title || !description) {
			return fail(400, { error: 'Event title and description are required.' });
		}

		if ((startsAt !== null && Number.isNaN(startsAt)) || (endsAt !== null && Number.isNaN(endsAt))) {
			return fail(400, { error: 'Event start and end times must be valid dates.' });
		}

		if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
			return fail(400, { error: 'Event end time must be later than the start time.' });
		}

		await createEvent(db, {
			title,
			description,
			eventKind: readText(data, 'eventKind') === 'vip_call' ? 'vip_call' : 'livestream',
			accessTier: readAudience(data, 'accessTier'),
			status:
				readText(data, 'status') === 'live'
					? 'live'
					: readText(data, 'status') === 'ended'
						? 'ended'
						: 'scheduled',
			startsAt,
			endsAt,
			embedUrl: readOptionalText(data, 'embedUrl'),
			bookingUrl: readOptionalText(data, 'bookingUrl'),
			locationType:
				readText(data, 'locationType') === 'zoom'
					? 'zoom'
					: readText(data, 'locationType') === 'external'
						? 'external'
						: 'youtube',
			reminderEnabled: readChecked(data, 'reminderEnabled')
		});

		return { success: true };
	},

	updateEvent: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const id = readText(data, 'id');
		const title = readText(data, 'title');
		const description = readText(data, 'description');
		const startsAt = data.get('startsAt') ? Date.parse(String(data.get('startsAt'))) : null;
		const endsAt = data.get('endsAt') ? Date.parse(String(data.get('endsAt'))) : null;

		if (!id || !title || !description) {
			return fail(400, { error: 'Existing events require an id, title, and description.' });
		}

		if ((startsAt !== null && Number.isNaN(startsAt)) || (endsAt !== null && Number.isNaN(endsAt))) {
			return fail(400, { error: 'Event start and end times must be valid dates.' });
		}

		if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
			return fail(400, { error: 'Event end time must be later than the start time.' });
		}

		await updateEvent(db, {
			id,
			title,
			description,
			eventKind: readText(data, 'eventKind') === 'vip_call' ? 'vip_call' : 'livestream',
			accessTier: readAudience(data, 'accessTier'),
			status:
				readText(data, 'status') === 'live'
					? 'live'
					: readText(data, 'status') === 'ended'
						? 'ended'
						: 'scheduled',
			startsAt,
			endsAt,
			embedUrl: readOptionalText(data, 'embedUrl'),
			bookingUrl: readOptionalText(data, 'bookingUrl'),
			locationType:
				readText(data, 'locationType') === 'zoom'
					? 'zoom'
					: readText(data, 'locationType') === 'external'
						? 'external'
						: 'youtube',
			reminderEnabled: readChecked(data, 'reminderEnabled')
		});

		return { success: 'Event updated.' };
	},

	createLink: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const label = readText(data, 'label');
		const url = readExternalUrl(data, 'url');

		if (!label || !url) {
			return fail(400, { error: 'External links require a label and a valid URL.' });
		}

		try {
			await createExternalLink(db, {
				label,
				url,
				audience: readAudience(data, 'audience'),
				sortOrder: readSortOrder(data, 'sortOrder'),
				description: readOptionalText(data, 'description'),
				ctaText: readOptionalText(data, 'ctaText'),
				linkKey: readOptionalText(data, 'linkKey')
			});
		} catch {
			return fail(400, { error: 'Could not create that external link. Check the URL and key.' });
		}

		return { success: 'External link created.' };
	},

	updateLink: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const id = readText(data, 'id');
		const label = readText(data, 'label');
		const url = readExternalUrl(data, 'url');

		if (!id || !label || !url) {
			return fail(400, { error: 'External links require an id, label, and valid URL.' });
		}

		try {
			await updateExternalLink(db, {
				id,
				label,
				url,
				audience: readAudience(data, 'audience'),
				sortOrder: readSortOrder(data, 'sortOrder'),
				description: readOptionalText(data, 'description'),
				ctaText: readOptionalText(data, 'ctaText'),
				linkKey: readOptionalText(data, 'linkKey')
			});
		} catch {
			return fail(400, { error: 'Could not update that external link. Check the URL and key.' });
		}

		return { success: 'External link updated.' };
	},

	approveVip: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const db = getDBFromPlatform(platform);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);

		const requestId = String(data.get('requestId') || '');
		const memberId = String(data.get('memberId') || '');
		const startsAt = Date.parse(String(data.get('startsAt') || ''));
		const endsAt = Date.parse(String(data.get('endsAt') || ''));
		const zoomJoinUrl = (String(data.get('zoomJoinUrl') || '').trim() || null);

		if (!requestId || !memberId || Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
			return fail(400, { error: 'Request, member, and schedule details are required.' });
		}

		await approveVipCallRequest(db, {
			requestId,
			memberId,
			startsAt,
			endsAt,
			zoomJoinUrl
		});

		const member = await getMemberByClerkId(db, memberId);

		if (member?.email) {
			await sendVipBookingEmail(runtimeEnv, {
				email: member.email,
				name: member.name,
				startsAt: new Date(startsAt).toLocaleString(),
				joinUrl: zoomJoinUrl
			});
		}

		return { success: true };
	},

	sendReminder: async ({ request, locals, platform }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const runtimeEnv = resolveRuntimeEnv(
			(platform as { env?: Record<string, string | undefined> } | undefined)?.env
		);

		const eventId = String(data.get('eventId') || '');
		if (!eventId) {
			return fail(400, { error: 'Reminder requires an event.' });
		}

		const db = getDBFromPlatform(platform);
		const event = await getEventById(db, eventId);
		if (!event || !event.startsAt) {
			return fail(400, { error: 'Reminder requires a scheduled event with a start time.' });
		}

		const recipients = await listEventReminderRecipients(db, eventId);
		if (recipients.length === 0) {
			return fail(400, { error: 'No RSVP recipients are ready for reminders yet.' });
		}

		await Promise.all(
			recipients.map((recipient) =>
				sendLivestreamReminderEmail(runtimeEnv, {
					email: recipient.email,
					name: recipient.name,
					title: event.title,
					startsAt: new Date(event.startsAt!).toLocaleString()
				})
			)
		);

		return { success: `${recipients.length} reminder${recipients.length === 1 ? '' : 's'} sent.` };
	}
};
