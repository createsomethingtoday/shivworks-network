import { describe, expect, it } from 'vitest';
import { load } from './[...rest]/+page.server';

describe('signup page load', () => {
	it('redirects active free users to the preserved destination', async () => {
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
				url: new URL('https://network.shivworks.com/signup?redirect=/vip-calls')
			} as never)
		).rejects.toMatchObject({ status: 302, location: '/vip-calls' });
	});

	it('sends signed-in but non-entitled users to checkout with the preserved destination', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: 'user_123', sessionId: 'sess_123', isAuthenticated: true },
					user: {
						clerkUserId: 'user_123',
						email: 'member@example.com',
						name: 'Member',
						tier: null,
						role: 'member',
						accessStatus: 'none',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				},
				url: new URL('https://network.shivworks.com/signup?redirect=/community')
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/checkout?redirect=%2Fcommunity'
		});
	});

	it('returns provisioned signup context for imported purchasers', async () => {
		await expect(
			load({
				locals: {
					auth: { userId: null, sessionId: null, isAuthenticated: false },
					user: null
				},
				url: new URL('https://network.shivworks.com/signup?email=member%40example.com&provisioned=1')
			} as never)
		).resolves.toMatchObject({
			redirectTo: '/dashboard',
			provisioned: true,
			provisionedEmail: 'member@example.com'
		});
	});
});
