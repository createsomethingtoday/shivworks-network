import type { ClerkClient } from '@clerk/backend';
import {
	canAccessAudience,
	normalizeContentAudience,
	type MembershipTier,
	type AccessStatus,
	type ContentAudience
} from '$lib/constants/tiers';
import {
	DEFAULT_MEMBER_NOTIFICATION_PREFERENCES,
	type MemberNotificationPreferences
} from '$lib/constants/notifications';
import type { D1Compat } from '$lib/server/d1-compat';
import { getDisplayName, getPrimaryEmail, isUserEmailVerified } from '$lib/server/clerk';

export interface MemberRecord {
	clerkUserId: string;
	email: string;
	name: string;
	tier: MembershipTier | null;
	accessStatus: AccessStatus;
	role: 'member' | 'admin';
	createdAt: string;
	updatedAt: string;
}

export interface ImportedMemberProvisionRecord {
	id: string;
	email: string;
	name: string;
	tier: MembershipTier;
	accessStatus: AccessStatus;
	role: 'member' | 'admin';
	sourceRef: string | null;
	invitedAt: number | null;
	lastEmailedAt: number | null;
	claimedMemberId: string | null;
	claimedAt: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface StoredMemberNotificationPreferences extends MemberNotificationPreferences {
	memberId: string;
	createdAt: string;
	updatedAt: string;
}

export interface ActivityUpdateRecord {
	id: string;
	title: string;
	bodyMarkdown: string;
	audience: ContentAudience;
	publishedAt: number;
	authorName: string | null;
}

export interface CourseRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: 'coming_soon' | 'available' | 'archived';
	sortOrder: number;
	badgeText: string | null;
	artworkUrl: string | null;
	courseKind: 'course' | 'series';
	accessTier: ContentAudience;
	totalModuleCount: number;
	availableModuleCount: number;
	roadmapModuleCount: number;
	completedModuleCount: number;
	startedModuleCount: number;
}

export type CourseModuleVideoKind = 'none' | 'mp4' | 'embed';

export interface CourseModuleRecord {
	id: string;
	courseId: string;
	title: string;
	description: string | null;
	sortOrder: number;
	status: 'coming_soon' | 'available' | 'archived';
	videoKind: CourseModuleVideoKind;
	videoUrl: string | null;
	durationLabel: string | null;
}

export interface MemberModuleProgressRecord {
	moduleId: string;
	currentSeconds: number;
	durationSeconds: number | null;
	completedAt: number | null;
	updatedAt: number;
}

export interface ResumeModuleRecord extends MemberModuleProgressRecord {
	courseSlug: string;
	courseTitle: string;
	courseAccessTier: ContentAudience;
	moduleTitle: string;
}

export interface SeriesRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	status: 'coming_soon' | 'available' | 'archived';
	artworkUrl: string | null;
	accessTier: ContentAudience;
}

export interface EventRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	eventKind: 'livestream' | 'vip_call';
	accessTier: ContentAudience;
	status: 'scheduled' | 'live' | 'ended';
	startsAt: number | null;
	endsAt: number | null;
	locationType: 'youtube' | 'zoom' | 'external';
	embedUrl: string | null;
	bookingUrl: string | null;
	reminderEnabled: boolean;
}

export interface MemberSessionRecord {
	sessionId: string;
	memberId: string;
	deviceLabel: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: number;
	lastActiveAt: number;
	revokedAt: number | null;
	revokeReason: string | null;
}

export interface VipCallRequestRecord {
	id: string;
	memberId: string;
	goals: string;
	preferredMonth: string | null;
	notes: string | null;
	status: 'requested' | 'approved' | 'scheduled' | 'completed' | 'declined';
	createdAt: number;
	updatedAt: number;
}

export interface PendingVipCallRequestRecord extends VipCallRequestRecord {
	memberEmail: string | null;
	memberName: string | null;
	memberTier: MembershipTier | null;
}

export interface VipCallBookingRecord {
	id: string;
	requestId: string;
	memberId: string;
	startsAt: number;
	endsAt: number;
	zoomJoinUrl: string | null;
	confirmationSentAt: number | null;
}

export interface ExternalLinkRecord {
	id: string;
	linkKey: string;
	label: string;
	url: string;
	audience: ContentAudience;
	sortOrder: number;
	description: string | null;
	ctaText: string | null;
}

export interface EventReminderRecipient {
	memberId: string;
	email: string;
	name: string;
}

export interface UpdateNotificationRecipient extends EventReminderRecipient {
	tier: MembershipTier | null;
	role: 'member' | 'admin';
}

function toIso(value: number | string | null | undefined): string {
	const numeric = typeof value === 'string' ? Number(value) : value;
	return new Date(numeric || Date.now()).toISOString();
}

function slugify(value: string, fallback = 'item'): string {
	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

	return slug || fallback;
}

function hasValue<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

function mapMember(row: Record<string, unknown>): MemberRecord {
	return {
		clerkUserId: String(row.clerk_user_id),
		email: String(row.email || ''),
		name: String(row.name || 'Member'),
		tier:
			row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip' ? row.tier : null,
		accessStatus:
			row.access_status === 'active' || row.access_status === 'revoked'
				? row.access_status
				: 'none',
		role: row.role === 'admin' ? 'admin' : 'member',
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapAudience(value: unknown): ContentAudience {
	return normalizeContentAudience(value);
}

function mapMemberNotificationPreferences(
	row: Record<string, unknown>
): StoredMemberNotificationPreferences {
	return {
		memberId: String(row.member_id),
		buildUpdates:
			hasValue(row.build_updates) && Number(row.build_updates) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.buildUpdates,
		contentReleaseAlerts:
			hasValue(row.content_release_alerts) && Number(row.content_release_alerts) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.contentReleaseAlerts,
		livestreamReminders:
			hasValue(row.livestream_reminders) && Number(row.livestream_reminders) === 0
				? false
				: DEFAULT_MEMBER_NOTIFICATION_PREFERENCES.livestreamReminders,
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapImportedMemberProvision(
	row: Record<string, unknown>
): ImportedMemberProvisionRecord {
	return {
		id: String(row.id),
		email: String(row.email || ''),
		name: String(row.name || 'Member'),
		tier:
			row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip'
				? row.tier
				: 'free',
		accessStatus:
			row.access_status === 'active' || row.access_status === 'revoked'
				? row.access_status
				: 'none',
		role: row.role === 'admin' ? 'admin' : 'member',
		sourceRef: row.source_ref ? String(row.source_ref) : null,
		invitedAt: hasValue(row.invited_at) ? Number(row.invited_at) : null,
		lastEmailedAt: hasValue(row.last_emailed_at) ? Number(row.last_emailed_at) : null,
		claimedMemberId: row.claimed_member_id ? String(row.claimed_member_id) : null,
		claimedAt: hasValue(row.claimed_at) ? Number(row.claimed_at) : null,
		createdAt: toIso(row.created_at as number | null),
		updatedAt: toIso(row.updated_at as number | null)
	};
}

function mapCourse(row: Record<string, unknown>): CourseRecord {
	return {
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		sortOrder: Number(row.sort_order || 0),
		badgeText: row.badge_text ? String(row.badge_text) : null,
		artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
		courseKind: row.course_kind === 'series' ? 'series' : 'course',
		accessTier: mapAudience(row.access_tier),
		totalModuleCount: Number(row.total_module_count || 0),
		availableModuleCount: Number(row.available_module_count || 0),
		roadmapModuleCount: Number(row.roadmap_module_count || 0),
		completedModuleCount: Number(row.completed_module_count || 0),
		startedModuleCount: Number(row.started_module_count || 0)
	};
}

function mapCourseModule(row: Record<string, unknown>): CourseModuleRecord {
	return {
		id: String(row.id),
		courseId: String(row.course_id),
		title: String(row.title),
		description: row.description ? String(row.description) : null,
		sortOrder: Number(row.sort_order || 0),
		status: row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		videoKind:
			row.video_kind === 'mp4' || row.video_kind === 'embed' ? row.video_kind : 'none',
		videoUrl: row.video_url ? String(row.video_url) : null,
		durationLabel: row.duration_label ? String(row.duration_label) : null
	};
}

function mapMemberModuleProgress(row: Record<string, unknown>): MemberModuleProgressRecord {
	return {
		moduleId: String(row.module_id),
		currentSeconds: Number(row.current_seconds || 0),
		durationSeconds: hasValue(row.duration_seconds) ? Number(row.duration_seconds) : null,
		completedAt: hasValue(row.completed_at) ? Number(row.completed_at) : null,
		updatedAt: Number(row.updated_at || 0)
	};
}

export async function getMemberByClerkId(
	db: D1Compat,
	clerkUserId: string
): Promise<MemberRecord | null> {
	const row = await db
		.prepare('SELECT * FROM members WHERE clerk_user_id = ? LIMIT 1')
		.bind(clerkUserId)
		.first<Record<string, unknown>>();

	return row ? mapMember(row) : null;
}

export async function getMemberByEmail(
	db: D1Compat,
	email: string
): Promise<MemberRecord | null> {
	const row = await db
		.prepare('SELECT * FROM members WHERE lower(email) = lower(?) LIMIT 1')
		.bind(email)
		.first<Record<string, unknown>>();

	return row ? mapMember(row) : null;
}

async function getImportedMemberProvisionByEmail(
	db: D1Compat,
	email: string
): Promise<ImportedMemberProvisionRecord | null> {
	const row = await db
		.prepare('SELECT * FROM member_imports WHERE lower(email) = lower(?) LIMIT 1')
		.bind(email)
		.first<Record<string, unknown>>();

	return row ? mapImportedMemberProvision(row) : null;
}

export async function claimImportedMemberProvision(
	db: D1Compat,
	data: {
		clerkUserId: string;
		email: string;
		name: string;
	}
): Promise<ImportedMemberProvisionRecord | null> {
	const row = await db
		.prepare('SELECT * FROM member_imports WHERE lower(email) = lower(?) AND claimed_at IS NULL LIMIT 1')
		.bind(data.email)
		.first<Record<string, unknown>>();

	if (!row) {
		return null;
	}

	const provision = mapImportedMemberProvision(row);
	const now = Date.now();
	const resolvedName = data.name.trim() || provision.name || 'Member';

	await db
		.prepare(
			`UPDATE members
			 SET email = ?, name = ?, tier = ?, access_status = ?, role = ?, updated_at = ?
			 WHERE clerk_user_id = ?`
		)
		.bind(
			data.email,
			resolvedName,
			provision.tier,
			provision.accessStatus,
			provision.role,
			now,
			data.clerkUserId
		)
		.run();

	if ((provision.tier === 'bronze' || provision.tier === 'vip') && provision.accessStatus === 'active') {
		await db
			.prepare(
				`INSERT OR IGNORE INTO member_entitlements (
					id,
					member_id,
					tier,
					source_type,
					source_ref,
					status,
					created_at,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				crypto.randomUUID(),
				data.clerkUserId,
				provision.tier,
				'import',
				provision.id,
				'active',
				now,
				now
			)
			.run();
	}

	await db
		.prepare(
			`UPDATE member_imports
			 SET claimed_member_id = ?, claimed_at = ?, updated_at = ?
			 WHERE id = ?`
		)
		.bind(data.clerkUserId, now, now, provision.id)
		.run();

	return getImportedMemberProvisionByEmail(db, data.email);
}

export async function getMemberNotificationPreferences(
	db: D1Compat,
	memberId: string
): Promise<StoredMemberNotificationPreferences> {
	const row = await db
		.prepare('SELECT * FROM member_notification_preferences WHERE member_id = ? LIMIT 1')
		.bind(memberId)
		.first<Record<string, unknown>>();

	if (!row) {
		const now = new Date().toISOString();
		return {
			memberId,
			...DEFAULT_MEMBER_NOTIFICATION_PREFERENCES,
			createdAt: now,
			updatedAt: now
		};
	}

	return mapMemberNotificationPreferences(row);
}

export async function upsertMemberNotificationPreferences(
	db: D1Compat,
	memberId: string,
	input: MemberNotificationPreferences
): Promise<StoredMemberNotificationPreferences> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_notification_preferences (
				member_id,
				build_updates,
				content_release_alerts,
				livestream_reminders,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(member_id) DO UPDATE SET
				build_updates = excluded.build_updates,
				content_release_alerts = excluded.content_release_alerts,
				livestream_reminders = excluded.livestream_reminders,
				updated_at = excluded.updated_at`
		)
		.bind(
			memberId,
			input.buildUpdates ? 1 : 0,
			input.contentReleaseAlerts ? 1 : 0,
			input.livestreamReminders ? 1 : 0,
			now,
			now
		)
		.run();

	return getMemberNotificationPreferences(db, memberId);
}

export async function ensureMemberIdentity(
	db: D1Compat,
	clerkClient: ClerkClient,
	clerkUserId: string
): Promise<MemberRecord> {
	const existing = await getMemberByClerkId(db, clerkUserId);
	if (existing) {
		await claimImportedMemberProvision(db, {
			clerkUserId,
			email: existing.email,
			name: existing.name
		});

		return (await getMemberByClerkId(db, clerkUserId)) || existing;
	}

	const user = await clerkClient.users.getUser(clerkUserId);
	const now = Date.now();

	await db
		.prepare(
			`INSERT INTO members (
				clerk_user_id,
				email,
				name,
				tier,
				access_status,
				role,
				email_verified,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			user.id,
			getPrimaryEmail(user),
			getDisplayName(user),
			'free',
			'active',
			'member',
			isUserEmailVerified(user) ? 1 : 0,
			now,
			now
		)
		.run();

	await claimImportedMemberProvision(db, {
		clerkUserId: user.id,
		email: getPrimaryEmail(user),
		name: getDisplayName(user)
	});

	const created = await getMemberByClerkId(db, clerkUserId);
	if (!created) {
		throw new Error('Failed to create ShivWorks member record');
	}

	return created;
}

export async function upsertMemberFromWebhook(
	db: D1Compat,
	data: {
		clerkUserId: string;
		email: string;
		name: string;
		emailVerified: boolean;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO members (
				clerk_user_id,
				email,
				name,
				tier,
				access_status,
				role,
				email_verified,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(clerk_user_id) DO UPDATE SET
				email = excluded.email,
				name = excluded.name,
				email_verified = excluded.email_verified,
				updated_at = excluded.updated_at`
		)
		.bind(
			data.clerkUserId,
			data.email,
			data.name,
			'free',
			'active',
			'member',
			data.emailVerified ? 1 : 0,
			now,
			now
		)
		.run();

	await claimImportedMemberProvision(db, {
		clerkUserId: data.clerkUserId,
		email: data.email,
		name: data.name
	});
}

export async function deleteMemberByClerkId(db: D1Compat, clerkUserId: string): Promise<void> {
	await db.prepare('DELETE FROM members WHERE clerk_user_id = ?').bind(clerkUserId).run();
}

export async function activateMemberEntitlement(
	db: D1Compat,
	data: {
		clerkUserId: string;
		tier: MembershipTier;
		sourceType: 'stripe' | 'import' | 'admin';
		sourceRef: string;
	}
): Promise<void> {
	const now = Date.now();

	await db
		.prepare(
			`UPDATE members
			 SET tier = ?, access_status = 'active', updated_at = ?
			 WHERE clerk_user_id = ?`
		)
		.bind(data.tier, now, data.clerkUserId)
		.run();

	await db
		.prepare(
			`INSERT INTO member_entitlements (
				id,
				member_id,
				tier,
				source_type,
				source_ref,
				status,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
		)
		.bind(crypto.randomUUID(), data.clerkUserId, data.tier, data.sourceType, data.sourceRef, now, now)
		.run();
}

export async function listRecentUpdates(db: D1Compat, member: MemberRecord | null, limit = 6) {
	const results = await db
		.prepare('SELECT * FROM activity_updates ORDER BY published_at DESC')
		.bind()
		.all<Record<string, unknown>>();

	return results.results
		.map((row) => ({
			id: String(row.id),
			title: String(row.title),
			bodyMarkdown: String(row.body_markdown || ''),
			audience: mapAudience(row.audience),
			publishedAt: Number(row.published_at || 0),
			authorName: row.author_name ? String(row.author_name) : null
		}))
		.filter((row) => canAccessAudience(member, row.audience))
		.slice(0, limit) satisfies ActivityUpdateRecord[];
}

export async function listCourses(
	db: D1Compat,
	member?: MemberRecord | null
): Promise<CourseRecord[]> {
	const progressMemberId = member?.clerkUserId || '__none__';
	const results = await db
		.prepare(
			`SELECT
				courses.*,
				COUNT(DISTINCT course_modules.id) AS total_module_count,
				COUNT(DISTINCT CASE
					WHEN course_modules.status = 'available' THEN course_modules.id
				END) AS available_module_count,
				COUNT(DISTINCT CASE
					WHEN course_modules.status = 'coming_soon' THEN course_modules.id
				END) AS roadmap_module_count,
				COUNT(DISTINCT CASE
					WHEN member_module_progress.completed_at IS NOT NULL THEN course_modules.id
				END) AS completed_module_count,
				COUNT(DISTINCT CASE
					WHEN member_module_progress.current_seconds > 0
						OR member_module_progress.completed_at IS NOT NULL
					THEN course_modules.id
				END) AS started_module_count
			 FROM courses
			 LEFT JOIN course_modules ON course_modules.course_id = courses.id
			 LEFT JOIN member_module_progress
			 	ON member_module_progress.module_id = course_modules.id
			 	AND member_module_progress.member_id = ?
			 GROUP BY courses.id
			 ORDER BY courses.sort_order ASC, courses.title ASC`
		)
		.bind(progressMemberId)
		.all<Record<string, unknown>>();

	const mapped = results.results.map(mapCourse);

	return member === undefined
		? mapped
		: mapped.filter((course) => canAccessAudience(member, course.accessTier));
}

export async function getCourseBySlug(db: D1Compat, slug: string): Promise<CourseRecord | null> {
	const row = await db
		.prepare('SELECT * FROM courses WHERE slug = ? LIMIT 1')
		.bind(slug)
		.first<Record<string, unknown>>();

	return row ? mapCourse(row) : null;
}

export async function listCourseModules(
	db: D1Compat,
	courseId?: string
): Promise<CourseModuleRecord[]> {
	const statement = courseId
		? db
				.prepare(
					'SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, title ASC'
				)
				.bind(courseId)
		: db.prepare('SELECT * FROM course_modules ORDER BY course_id ASC, sort_order ASC, title ASC');

	const results = await statement.all<Record<string, unknown>>();
	return results.results.map(mapCourseModule);
}

export async function getCourseModuleById(
	db: D1Compat,
	moduleId: string
): Promise<
	| (CourseModuleRecord & {
			courseSlug: string;
			courseTitle: string;
			courseAccessTier: ContentAudience;
	  })
	| null
> {
	const row = await db
		.prepare(
			`SELECT
				course_modules.*,
				courses.slug AS course_slug,
				courses.title AS course_title,
				courses.access_tier AS course_access_tier
			 FROM course_modules
			 INNER JOIN courses ON courses.id = course_modules.course_id
			 WHERE course_modules.id = ?
			 LIMIT 1`
		)
		.bind(moduleId)
		.first<Record<string, unknown>>();

	if (!row) {
		return null;
	}

	const module = mapCourseModule(row);

	return {
		...module,
		courseSlug: String(row.course_slug),
		courseTitle: String(row.course_title),
		courseAccessTier: mapAudience(row.course_access_tier)
	};
}

export async function listMemberModuleProgress(
	db: D1Compat,
	memberId: string
): Promise<MemberModuleProgressRecord[]> {
	const results = await db
		.prepare(
			`SELECT module_id, current_seconds, duration_seconds, completed_at, updated_at
			 FROM member_module_progress
			 WHERE member_id = ?
			 ORDER BY updated_at DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map(mapMemberModuleProgress);
}

export async function getLatestModuleProgressForMember(
	db: D1Compat,
	member: MemberRecord
): Promise<ResumeModuleRecord | null> {
	const results = await db
		.prepare(
			`SELECT
				member_module_progress.module_id,
				member_module_progress.current_seconds,
				member_module_progress.duration_seconds,
				member_module_progress.completed_at,
				member_module_progress.updated_at,
				course_modules.title AS module_title,
				courses.slug AS course_slug,
				courses.title AS course_title,
				courses.access_tier AS course_access_tier
			 FROM member_module_progress
			 INNER JOIN course_modules ON course_modules.id = member_module_progress.module_id
			 INNER JOIN courses ON courses.id = course_modules.course_id
			 WHERE member_module_progress.member_id = ?
			 ORDER BY CASE WHEN member_module_progress.completed_at IS NULL THEN 0 ELSE 1 END ASC,
			 		  member_module_progress.updated_at DESC`
		)
		.bind(member.clerkUserId)
		.all<Record<string, unknown>>();

	for (const row of results.results) {
		const courseAccessTier = mapAudience(row.course_access_tier);
		if (!canAccessAudience(member, courseAccessTier)) {
			continue;
		}

		const progress = mapMemberModuleProgress(row);
		return {
			...progress,
			courseSlug: String(row.course_slug),
			courseTitle: String(row.course_title),
			courseAccessTier,
			moduleTitle: String(row.module_title)
		};
	}

	return null;
}

export async function listSeries(
	db: D1Compat,
	member?: MemberRecord | null
): Promise<SeriesRecord[]> {
	const results = await db
		.prepare('SELECT * FROM series ORDER BY title ASC')
		.all<Record<string, unknown>>();

	const mapped = results.results.map((row) => ({
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		status:
			row.status === 'available' || row.status === 'archived' ? row.status : 'coming_soon',
		artworkUrl: row.artwork_url ? String(row.artwork_url) : null,
		accessTier: mapAudience(row.access_tier)
	})) satisfies SeriesRecord[];

	return member === undefined
		? mapped
		: mapped.filter((series) => canAccessAudience(member, series.accessTier));
}

export async function listEvents(
	db: D1Compat,
	member: MemberRecord | null
): Promise<EventRecord[]> {
	const results = await db
		.prepare('SELECT * FROM events ORDER BY COALESCE(starts_at, created_at) ASC')
		.bind()
		.all<Record<string, unknown>>();

	const mapped = results.results.map((row) => ({
			id: String(row.id),
			slug: String(row.slug),
			title: String(row.title),
			description: String(row.description || ''),
			eventKind: row.event_kind === 'vip_call' ? 'vip_call' : 'livestream',
			accessTier: mapAudience(row.access_tier),
			status:
				row.status === 'live' || row.status === 'ended' ? row.status : 'scheduled',
			startsAt: hasValue(row.starts_at) ? Number(row.starts_at) : null,
			endsAt: hasValue(row.ends_at) ? Number(row.ends_at) : null,
			locationType:
				row.location_type === 'zoom' || row.location_type === 'external'
					? row.location_type
					: 'youtube',
			embedUrl: row.embed_url ? String(row.embed_url) : null,
			bookingUrl: row.booking_url ? String(row.booking_url) : null,
			reminderEnabled: Boolean(row.reminder_enabled)
		})) satisfies EventRecord[];

	return mapped.filter((row) => canAccessAudience(member, row.accessTier));
}

export async function listExternalLinks(
	db: D1Compat,
	member: MemberRecord | null
): Promise<ExternalLinkRecord[]> {
	const results = await db
		.prepare('SELECT * FROM external_links ORDER BY sort_order ASC')
		.bind()
		.all<Record<string, unknown>>();

	return results.results
		.map((row) => ({
			id: String(row.id),
			linkKey: String(row.link_key),
			label: String(row.label),
			url: String(row.url),
			audience: mapAudience(row.audience),
			sortOrder: Number(row.sort_order || 0),
			description: row.description ? String(row.description) : null,
			ctaText: row.cta_text ? String(row.cta_text) : null
		}))
		.filter((row) => canAccessAudience(member, row.audience)) satisfies ExternalLinkRecord[];
}

export async function listAdminExternalLinks(db: D1Compat): Promise<ExternalLinkRecord[]> {
	const results = await db
		.prepare('SELECT * FROM external_links ORDER BY sort_order ASC, label ASC')
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		linkKey: String(row.link_key),
		label: String(row.label),
		url: String(row.url),
		audience: mapAudience(row.audience),
		sortOrder: Number(row.sort_order || 0),
		description: row.description ? String(row.description) : null,
		ctaText: row.cta_text ? String(row.cta_text) : null
	}));
}

export async function upsertEventRsvp(
	db: D1Compat,
	memberId: string,
	eventId: string,
	status: 'going' | 'interested' | 'cancelled' = 'going'
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO event_rsvps (
				id,
				event_id,
				member_id,
				status,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(event_id, member_id) DO UPDATE SET
				status = excluded.status,
				updated_at = excluded.updated_at`
		)
		.bind(crypto.randomUUID(), eventId, memberId, status, now, now)
		.run();
}

export async function getRsvpForMember(
	db: D1Compat,
	memberId: string
): Promise<Record<string, string>> {
	const results = await db
		.prepare('SELECT event_id, status FROM event_rsvps WHERE member_id = ?')
		.bind(memberId)
		.all<{ event_id: string; status: string }>();

	return Object.fromEntries((results.results || []).map((row) => [row.event_id, row.status]));
}

export async function listEventReminderRecipients(
	db: D1Compat,
	eventId: string
): Promise<EventReminderRecipient[]> {
	const results = await db
		.prepare(
			`SELECT
				members.clerk_user_id AS member_id,
				members.email AS email,
				members.name AS name
			 FROM event_rsvps
			 INNER JOIN members ON members.clerk_user_id = event_rsvps.member_id
			 LEFT JOIN member_notification_preferences
			 	ON member_notification_preferences.member_id = members.clerk_user_id
			 WHERE event_rsvps.event_id = ?
			   AND event_rsvps.status = 'going'
			   AND members.access_status = 'active'
			   AND COALESCE(member_notification_preferences.livestream_reminders, 1) = 1
			   AND members.email <> ''
			 ORDER BY event_rsvps.updated_at DESC`
		)
		.bind(eventId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		memberId: String(row.member_id),
		email: String(row.email || ''),
		name: String(row.name || 'Member')
	}));
}

async function listAudienceNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience,
	preferenceColumn: 'build_updates' | 'content_release_alerts'
): Promise<UpdateNotificationRecipient[]> {
	const preferenceFilter =
		preferenceColumn === 'content_release_alerts'
			? 'COALESCE(member_notification_preferences.content_release_alerts, 1) = 1'
			: 'COALESCE(member_notification_preferences.build_updates, 1) = 1';

	const results = await db
		.prepare(
			`SELECT
				members.clerk_user_id AS member_id,
				members.email AS email,
				members.name AS name,
				members.tier AS tier,
				members.role AS role
			 FROM members
			 LEFT JOIN member_notification_preferences
			 	ON member_notification_preferences.member_id = members.clerk_user_id
			 WHERE members.access_status = 'active'
			   AND ${preferenceFilter}
			   AND members.email <> ''
			 ORDER BY members.updated_at DESC`
		)
		.all<Record<string, unknown>>();

	return results.results
		.map((row): UpdateNotificationRecipient => ({
			memberId: String(row.member_id),
			email: String(row.email || ''),
			name: String(row.name || 'Member'),
			tier:
				row.tier === 'free' || row.tier === 'bronze' || row.tier === 'vip'
					? row.tier
					: null,
			role: row.role === 'admin' ? 'admin' : 'member'
		}))
		.filter((recipient) => canAccessAudience(recipient, audience));
}

export async function listUpdateNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience
): Promise<UpdateNotificationRecipient[]> {
	return listAudienceNotificationRecipients(db, audience, 'build_updates');
}

export async function listContentReleaseNotificationRecipients(
	db: D1Compat,
	audience: ContentAudience
): Promise<UpdateNotificationRecipient[]> {
	return listAudienceNotificationRecipients(db, audience, 'content_release_alerts');
}

export async function createVipCallRequest(
	db: D1Compat,
	memberId: string,
	goals: string,
	preferredMonth: string | null,
	notes: string | null
): Promise<boolean> {
	const existing = await db
		.prepare(
			`SELECT id FROM vip_call_requests
			 WHERE member_id = ?
			   AND status IN ('requested', 'approved', 'scheduled')
			 LIMIT 1`
		)
		.bind(memberId)
		.first<Record<string, unknown>>();

	if (existing) {
		return false;
	}

	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO vip_call_requests (
				id,
				member_id,
				goals,
				preferred_month,
				notes,
				status,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, 'requested', ?, ?)`
		)
		.bind(crypto.randomUUID(), memberId, goals, preferredMonth, notes, now, now)
		.run();

	return true;
}

export async function listVipCallRequestsForMember(
	db: D1Compat,
	memberId: string
): Promise<VipCallRequestRecord[]> {
	const results = await db
		.prepare('SELECT * FROM vip_call_requests WHERE member_id = ? ORDER BY created_at DESC')
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		memberId: String(row.member_id),
		goals: String(row.goals || ''),
		preferredMonth: row.preferred_month ? String(row.preferred_month) : null,
		notes: row.notes ? String(row.notes) : null,
		status:
			row.status === 'approved' ||
			row.status === 'scheduled' ||
			row.status === 'completed' ||
			row.status === 'declined'
				? row.status
				: 'requested',
		createdAt: Number(row.created_at || 0),
		updatedAt: Number(row.updated_at || 0)
	}));
}

export async function listVipCallBookingsForMember(
	db: D1Compat,
	memberId: string
): Promise<VipCallBookingRecord[]> {
	const results = await db
		.prepare('SELECT * FROM vip_call_bookings WHERE member_id = ? ORDER BY starts_at ASC')
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		requestId: String(row.request_id),
		memberId: String(row.member_id),
		startsAt: Number(row.starts_at || 0),
		endsAt: Number(row.ends_at || 0),
		zoomJoinUrl: row.zoom_join_url ? String(row.zoom_join_url) : null,
		confirmationSentAt: hasValue(row.confirmation_sent_at)
			? Number(row.confirmation_sent_at)
			: null
	}));
}

export async function listActiveMemberSessions(
	db: D1Compat,
	memberId: string
): Promise<MemberSessionRecord[]> {
	const results = await db
		.prepare(
			`SELECT * FROM member_sessions
			 WHERE member_id = ? AND revoked_at IS NULL
			 ORDER BY last_active_at DESC`
		)
		.bind(memberId)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		sessionId: String(row.session_id),
		memberId: String(row.member_id),
		deviceLabel: String(row.device_label || 'Unknown device'),
		ipAddress: row.ip_address ? String(row.ip_address) : null,
		userAgent: row.user_agent ? String(row.user_agent) : null,
		createdAt: Number(row.created_at || 0),
		lastActiveAt: Number(row.last_active_at || 0),
		revokedAt: hasValue(row.revoked_at) ? Number(row.revoked_at) : null,
		revokeReason: row.revoke_reason ? String(row.revoke_reason) : null
	}));
}

export async function upsertMemberSession(
	db: D1Compat,
	data: {
		memberId: string;
		sessionId: string;
		deviceLabel: string;
		ipAddress: string | null;
		userAgent: string | null;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_sessions (
				session_id,
				member_id,
				device_label,
				ip_address,
				user_agent,
				created_at,
				last_active_at,
				revoked_at,
				revoke_reason
			) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
			ON CONFLICT(session_id) DO UPDATE SET
				member_id = excluded.member_id,
				device_label = excluded.device_label,
				ip_address = excluded.ip_address,
				user_agent = excluded.user_agent,
				last_active_at = excluded.last_active_at,
				revoked_at = NULL,
				revoke_reason = NULL`
		)
		.bind(
			data.sessionId,
			data.memberId,
			data.deviceLabel,
			data.ipAddress,
			data.userAgent,
			now,
			now
		)
		.run();
}

export async function revokeMemberSession(
	db: D1Compat,
	memberId: string,
	sessionId: string,
	reason: string
): Promise<void> {
	await db
		.prepare(
			`UPDATE member_sessions
			 SET revoked_at = ?, revoke_reason = ?
			 WHERE member_id = ? AND session_id = ?`
		)
		.bind(Date.now(), reason, memberId, sessionId)
		.run();
}

export async function listAdminMembers(db: D1Compat): Promise<MemberRecord[]> {
	const results = await db
		.prepare('SELECT * FROM members ORDER BY updated_at DESC')
		.all<Record<string, unknown>>();
	return results.results.map(mapMember);
}

export async function updateMemberTier(
	db: D1Compat,
	memberId: string,
	tier: MembershipTier | null,
	accessStatus: AccessStatus
): Promise<void> {
	await db
		.prepare('UPDATE members SET tier = ?, access_status = ?, updated_at = ? WHERE clerk_user_id = ?')
		.bind(tier, accessStatus, Date.now(), memberId)
		.run();
}

export async function upsertImportedMemberProvision(
	db: D1Compat,
	input: {
		email: string;
		name: string;
		tier: MembershipTier;
		accessStatus: AccessStatus;
		role: 'member' | 'admin';
		sourceRef: string | null;
		invitedAt?: number | null;
		lastEmailedAt?: number | null;
	}
): Promise<ImportedMemberProvisionRecord> {
	const existing = await getImportedMemberProvisionByEmail(db, input.email);
	const now = Date.now();
	const id = existing?.id || crypto.randomUUID();
	const shouldResetClaim =
		Boolean(existing) &&
		(existing!.tier !== input.tier ||
			existing!.accessStatus !== input.accessStatus ||
			existing!.role !== input.role);

	await db
		.prepare(
			`INSERT INTO member_imports (
				id,
				email,
				name,
				tier,
				access_status,
				role,
				source_ref,
				invited_at,
				last_emailed_at,
				claimed_member_id,
				claimed_at,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(email) DO UPDATE SET
				name = excluded.name,
				tier = excluded.tier,
				access_status = excluded.access_status,
				role = excluded.role,
				source_ref = COALESCE(excluded.source_ref, member_imports.source_ref),
				invited_at = COALESCE(excluded.invited_at, member_imports.invited_at),
				last_emailed_at = COALESCE(excluded.last_emailed_at, member_imports.last_emailed_at),
				updated_at = excluded.updated_at`
		)
		.bind(
			id,
			input.email,
			input.name,
			input.tier,
			input.accessStatus,
			input.role,
			input.sourceRef,
			input.invitedAt ?? null,
			input.lastEmailedAt ?? null,
			shouldResetClaim ? null : existing?.claimedMemberId ?? null,
			shouldResetClaim ? null : existing?.claimedAt ?? null,
			existing ? Date.parse(existing.createdAt) : now,
			now
		)
		.run();

	const record = await getImportedMemberProvisionByEmail(db, input.email);
	if (!record) {
		throw new Error('Failed to upsert imported member provision');
	}

	return record;
}

export async function listImportedMemberProvisions(
	db: D1Compat
): Promise<ImportedMemberProvisionRecord[]> {
	const results = await db
		.prepare('SELECT * FROM member_imports ORDER BY updated_at DESC, created_at DESC')
		.all<Record<string, unknown>>();

	return results.results.map(mapImportedMemberProvision);
}

export async function updateCourseStatus(
	db: D1Compat,
	courseId: string,
	status: 'coming_soon' | 'available' | 'archived',
	badgeText: string | null,
	accessTier: ContentAudience
): Promise<void> {
	await db
		.prepare(
			'UPDATE courses SET status = ?, badge_text = ?, access_tier = ?, updated_at = ? WHERE id = ?'
		)
		.bind(status, badgeText, accessTier, Date.now(), courseId)
		.run();
}

export async function updateCourseModule(
	db: D1Compat,
	input: {
		moduleId: string;
		title: string;
		description: string | null;
		status: 'coming_soon' | 'available' | 'archived';
		videoKind: CourseModuleVideoKind;
		videoUrl: string | null;
		durationLabel: string | null;
	}
): Promise<void> {
	await db
		.prepare(
			`UPDATE course_modules
			 SET title = ?,
			 	 description = ?,
			 	 status = ?,
			 	 video_kind = ?,
			 	 video_url = ?,
			 	 duration_label = ?,
			 	 updated_at = ?
			 WHERE id = ?`
		)
		.bind(
			input.title,
			input.description,
			input.status,
			input.videoKind,
			input.videoUrl,
			input.durationLabel,
			Date.now(),
			input.moduleId
		)
		.run();
}

export async function upsertMemberModuleProgress(
	db: D1Compat,
	input: {
		memberId: string;
		moduleId: string;
		currentSeconds: number;
		durationSeconds: number | null;
		completed: boolean;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO member_module_progress (
				id,
				member_id,
				module_id,
				current_seconds,
				duration_seconds,
				completed_at,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(member_id, module_id) DO UPDATE SET
				current_seconds = excluded.current_seconds,
				duration_seconds = excluded.duration_seconds,
				completed_at = excluded.completed_at,
				updated_at = excluded.updated_at`
		)
		.bind(
			crypto.randomUUID(),
			input.memberId,
			input.moduleId,
			Math.max(0, Math.round(input.currentSeconds)),
			input.durationSeconds === null ? null : Math.max(0, Math.round(input.durationSeconds)),
			input.completed ? now : null,
			now,
			now
		)
		.run();
}

export async function createExternalLink(
	db: D1Compat,
	input: {
		label: string;
		url: string;
		audience: ContentAudience;
		sortOrder: number;
		description: string | null;
		ctaText: string | null;
		linkKey?: string | null;
	}
): Promise<void> {
	const now = Date.now();
	const requestedKey = input.linkKey ? slugify(input.linkKey, 'link') : slugify(input.label, 'link');
	const existing = await db
		.prepare('SELECT id FROM external_links WHERE link_key = ? LIMIT 1')
		.bind(requestedKey)
		.first<Record<string, unknown>>();
	const linkKey = existing ? `${requestedKey}-${now}` : requestedKey;

	await db
		.prepare(
			`INSERT INTO external_links (
				id,
				link_key,
				label,
				url,
				audience,
				sort_order,
				description,
				cta_text,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			linkKey,
			input.label,
			input.url,
			input.audience,
			input.sortOrder,
			input.description,
			input.ctaText,
			now,
			now
		)
		.run();
}

export async function updateExternalLink(
	db: D1Compat,
	input: {
		id: string;
		label: string;
		url: string;
		audience: ContentAudience;
		sortOrder: number;
		description: string | null;
		ctaText: string | null;
		linkKey?: string | null;
	}
): Promise<void> {
	const linkKey = input.linkKey ? slugify(input.linkKey, 'link') : slugify(input.label, 'link');

	await db
		.prepare(
			`UPDATE external_links
			 SET link_key = ?,
			 	 label = ?,
			 	 url = ?,
			 	 audience = ?,
			 	 sort_order = ?,
			 	 description = ?,
			 	 cta_text = ?,
			 	 updated_at = ?
			 WHERE id = ?`
		)
		.bind(
			linkKey,
			input.label,
			input.url,
			input.audience,
			input.sortOrder,
			input.description,
			input.ctaText,
			Date.now(),
			input.id
		)
		.run();
}

export async function createActivityUpdate(
	db: D1Compat,
	input: {
		title: string;
		bodyMarkdown: string;
		audience: ContentAudience;
		authorName: string | null;
	}
): Promise<void> {
	const now = Date.now();
	await db
		.prepare(
			`INSERT INTO activity_updates (
				id,
				title,
				body_markdown,
				audience,
				author_name,
				published_at,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(crypto.randomUUID(), input.title, input.bodyMarkdown, input.audience, input.authorName, now, now, now)
		.run();
}

export async function createEvent(
	db: D1Compat,
	input: {
		title: string;
		description: string;
		eventKind: 'livestream' | 'vip_call';
		accessTier: ContentAudience;
		status: 'scheduled' | 'live' | 'ended';
		startsAt: number | null;
		endsAt: number | null;
		embedUrl: string | null;
		bookingUrl: string | null;
		locationType: 'youtube' | 'zoom' | 'external';
		reminderEnabled: boolean;
	}
): Promise<void> {
	const now = Date.now();
	const slugBase = slugify(input.title, 'event');

	await db
		.prepare(
			`INSERT INTO events (
				id,
				slug,
				title,
				description,
				event_kind,
				access_tier,
				status,
				starts_at,
				ends_at,
				location_type,
				embed_url,
				booking_url,
				reminder_enabled,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			crypto.randomUUID(),
			`${slugBase}-${now}`,
			input.title,
			input.description,
			input.eventKind,
			input.accessTier,
			input.status,
			input.startsAt,
			input.endsAt,
			input.locationType,
			input.embedUrl,
			input.bookingUrl,
			input.reminderEnabled ? 1 : 0,
			now,
			now
		)
		.run();
}

export async function updateEvent(
	db: D1Compat,
	input: {
		id: string;
		title: string;
		description: string;
		eventKind: 'livestream' | 'vip_call';
		accessTier: ContentAudience;
		status: 'scheduled' | 'live' | 'ended';
		startsAt: number | null;
		endsAt: number | null;
		embedUrl: string | null;
		bookingUrl: string | null;
		locationType: 'youtube' | 'zoom' | 'external';
		reminderEnabled: boolean;
	}
): Promise<void> {
	await db
		.prepare(
			`UPDATE events
			 SET title = ?,
			 	 description = ?,
			 	 event_kind = ?,
			 	 access_tier = ?,
			 	 status = ?,
			 	 starts_at = ?,
			 	 ends_at = ?,
			 	 location_type = ?,
			 	 embed_url = ?,
			 	 booking_url = ?,
			 	 reminder_enabled = ?,
			 	 updated_at = ?
			 WHERE id = ?`
		)
		.bind(
			input.title,
			input.description,
			input.eventKind,
			input.accessTier,
			input.status,
			input.startsAt,
			input.endsAt,
			input.locationType,
			input.embedUrl,
			input.bookingUrl,
			input.reminderEnabled ? 1 : 0,
			Date.now(),
			input.id
		)
		.run();
}

export async function listPendingVipCallRequests(
	db: D1Compat
): Promise<PendingVipCallRequestRecord[]> {
	const results = await db
		.prepare(
			`SELECT
				vip_call_requests.*,
				members.email AS member_email,
				members.name AS member_name,
				members.tier AS member_tier
			 FROM vip_call_requests
			 LEFT JOIN members ON members.clerk_user_id = vip_call_requests.member_id
			 WHERE vip_call_requests.status = 'requested'
			 ORDER BY created_at DESC`
		)
		.all<Record<string, unknown>>();

	return results.results.map((row) => ({
		id: String(row.id),
		memberId: String(row.member_id),
		goals: String(row.goals || ''),
		preferredMonth: row.preferred_month ? String(row.preferred_month) : null,
		notes: row.notes ? String(row.notes) : null,
		status:
			row.status === 'approved' || row.status === 'scheduled' ? row.status : 'requested',
		createdAt: Number(row.created_at || 0),
		updatedAt: Number(row.updated_at || 0),
		memberEmail: row.member_email ? String(row.member_email) : null,
		memberName: row.member_name ? String(row.member_name) : null,
		memberTier:
			row.member_tier === 'free' || row.member_tier === 'bronze' || row.member_tier === 'vip'
				? row.member_tier
				: null
	}));
}

export async function approveVipCallRequest(
	db: D1Compat,
	input: {
		requestId: string;
		memberId: string;
		startsAt: number;
		endsAt: number;
		zoomJoinUrl: string | null;
	}
): Promise<void> {
	const now = Date.now();

	await db
		.prepare('UPDATE vip_call_requests SET status = ?, updated_at = ? WHERE id = ?')
		.bind('scheduled', now, input.requestId)
		.run();

	await db
		.prepare(
			`INSERT INTO vip_call_bookings (
				id,
				request_id,
				member_id,
				starts_at,
				ends_at,
				zoom_join_url,
				confirmation_sent_at,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`
		)
		.bind(crypto.randomUUID(), input.requestId, input.memberId, input.startsAt, input.endsAt, input.zoomJoinUrl, now, now)
		.run();
}

export async function getEventById(db: D1Compat, eventId: string): Promise<EventRecord | null> {
	const row = await db
		.prepare('SELECT * FROM events WHERE id = ? LIMIT 1')
		.bind(eventId)
		.first<Record<string, unknown>>();
	if (!row) return null;

	return {
		id: String(row.id),
		slug: String(row.slug),
		title: String(row.title),
		description: String(row.description || ''),
		eventKind: row.event_kind === 'vip_call' ? 'vip_call' : 'livestream',
		accessTier: mapAudience(row.access_tier),
		status:
			row.status === 'live' || row.status === 'ended' ? row.status : 'scheduled',
		startsAt: hasValue(row.starts_at) ? Number(row.starts_at) : null,
		endsAt: hasValue(row.ends_at) ? Number(row.ends_at) : null,
		locationType:
			row.location_type === 'zoom' || row.location_type === 'external'
				? row.location_type
				: 'youtube',
		embedUrl: row.embed_url ? String(row.embed_url) : null,
		bookingUrl: row.booking_url ? String(row.booking_url) : null,
		reminderEnabled: Boolean(row.reminder_enabled)
	};
}
