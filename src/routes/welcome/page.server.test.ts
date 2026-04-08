import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

describe('welcome page load', () => {
	it('returns ready access state and a sanitized redirect target', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'vip',
						role: 'member',
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/welcome?returnTo=/vip-calls')
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'vip' }),
			ready: true,
			redirectTo: '/vip-calls'
		});
	});

	it('returns pending access state while membership is still syncing', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'free',
						role: 'member',
						accessStatus: 'none',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/welcome?returnTo=https://evil.test')
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'free' }),
			ready: false,
			redirectTo: '/dashboard'
		});
	});
});
