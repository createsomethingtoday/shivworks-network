import type { ClerkClient } from '@clerk/backend';
import type { D1Compat } from '$lib/server/d1-compat';
import type { MemberRecord } from '$lib/server/db/shivworks';
import {
	listActiveMemberSessions,
	revokeMemberSession,
	upsertMemberSession
} from '$lib/server/db/shivworks';
import { sendSessionSecurityEmail } from '$lib/email';

function deriveDeviceLabel(userAgent: string | null): string {
	if (!userAgent) return 'Unknown device';

	if (/iphone/i.test(userAgent)) return 'iPhone';
	if (/ipad/i.test(userAgent)) return 'iPad';
	if (/android/i.test(userAgent)) return 'Android device';
	if (/macintosh|mac os/i.test(userAgent)) return 'Mac';
	if (/windows/i.test(userAgent)) return 'Windows PC';
	if (/smart-tv|tv/i.test(userAgent)) return 'Smart TV';

	return 'Browser device';
}

function getClientIp(request: Request): string | null {
	const forwarded = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
	return forwarded?.split(',')[0]?.trim() || null;
}

export async function syncAndEnforceSessionLimit(input: {
	db: D1Compat;
	clerkClient: ClerkClient;
	member: MemberRecord;
	sessionId: string;
	request: Request;
	runtimeEnv: Record<string, string | undefined>;
}) {
	const { db, clerkClient, member, sessionId, request, runtimeEnv } = input;
	const ipAddress = getClientIp(request);
	const userAgent = request.headers.get('user-agent');
	const deviceLabel = deriveDeviceLabel(userAgent);

	await upsertMemberSession(db, {
		memberId: member.clerkUserId,
		sessionId,
		deviceLabel,
		ipAddress,
		userAgent
	});

	const activeSessions = await listActiveMemberSessions(db, member.clerkUserId);
	if (activeSessions.length <= 2) {
		return activeSessions;
	}

	const revokeCandidate = activeSessions
		.filter((session) => session.sessionId !== sessionId)
		.sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];

	if (!revokeCandidate) {
		return activeSessions;
	}

	await clerkClient.sessions.revokeSession(revokeCandidate.sessionId);
	await revokeMemberSession(
		db,
		member.clerkUserId,
		revokeCandidate.sessionId,
		'device_limit_exceeded'
	);

	await sendSessionSecurityEmail(runtimeEnv, {
		email: member.email,
		name: member.name,
		revokedDeviceLabel: revokeCandidate.deviceLabel,
		currentDeviceLabel: deviceLabel
	});

	return listActiveMemberSessions(db, member.clerkUserId);
}
