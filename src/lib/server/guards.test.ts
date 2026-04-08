import { describe, expect, it } from 'vitest';
import {
	requireAdmin,
	requireAuthenticated,
	requireEntitled,
	requirePaidMember,
	requireVip
} from '$lib/server/guards';

function createUser(
	overrides: Partial<NonNullable<App.Locals['user']>> = {}
): NonNullable<App.Locals['user']> {
	return {
		clerkUserId: 'user_123',
		email: 'member@example.com',
		name: 'Member Example',
		tier: 'bronze',
		role: 'member',
		accessStatus: 'active',
		createdAt: new Date('2026-04-02T00:00:00.000Z').toISOString(),
		updatedAt: new Date('2026-04-02T00:00:00.000Z').toISOString(),
		...overrides
	};
}

function createLocals(
	overrides: Partial<App.Locals> = {}
): App.Locals {
	return {
		auth: {
			userId: 'user_123',
			sessionId: 'sess_123',
			isAuthenticated: true
		},
		user: createUser(),
		...overrides
	};
}

function captureThrown(callback: () => unknown) {
	try {
		callback();
		throw new Error('Expected callback to throw');
	} catch (error) {
		return error;
	}
}

describe('route guards', () => {
	it('returns the authenticated user when access is valid', () => {
		const locals = createLocals();
		expect(requireAuthenticated(locals)).toEqual(locals.user);
		expect(requireEntitled(locals)).toEqual(locals.user);
	});

	it('redirects signed-out users to login with a preserved target', () => {
		const error = captureThrown(() =>
			requireAuthenticated(
				createLocals({
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				}),
				'/live'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/login?redirect=%2Flive'
		});
	});

	it('redirects authenticated users without access to checkout', () => {
		const error = captureThrown(() =>
			requireEntitled(
				createLocals({
					user: createUser({ accessStatus: 'none' })
				}),
				'/community'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
		});
	});

	it('redirects free users away from paid-member routes', () => {
		const error = captureThrown(() =>
			requirePaidMember(
				createLocals({
					user: createUser({ tier: 'free' })
				}),
				'/community'
			)
		) as { status: number; location: string };

		expect(error).toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
		});
	});

	it('denies bronze members from VIP-only routes', () => {
		const error = captureThrown(() => requireVip(createLocals())) as { status: number };
		expect(error).toMatchObject({ status: 403 });
	});

	it('allows admins through VIP and admin guards', () => {
		const locals = createLocals({
			user: createUser({ tier: 'bronze', role: 'admin' })
		});

		expect(requireVip(locals)).toEqual(locals.user);
		expect(requireAdmin(locals)).toEqual(locals.user);
	});
});
