import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

describe('checkout page load', () => {
	it('returns a sanitized redirect target for free-access users', async () => {
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
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/checkout?redirect=/community')
			} as never)
		).resolves.toMatchObject({
			user: expect.objectContaining({ clerkUserId: 'user_123', tier: 'free' }),
			redirectTo: '/community'
		});
	});

	it('redirects paid members back to the preserved destination', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: 'bronze',
						role: 'member',
						accessStatus: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/checkout?redirect=/library')
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/library'
		});
	});
});
