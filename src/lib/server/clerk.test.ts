import { describe, expect, it } from 'vitest';

import { resolveAuthorizedParties } from './clerk';

describe('resolveAuthorizedParties', () => {
	it('falls back to the canonical site url', () => {
		expect(
			resolveAuthorizedParties({
				PUBLIC_SITE_URL: 'https://shivworks-network.replit.app/'
			})
		).toEqual(['https://shivworks-network.replit.app']);
	});

	it('adds configured origins alongside the canonical site url', () => {
		expect(
			resolveAuthorizedParties({
				PUBLIC_SITE_URL: 'https://shivworks-network.replit.app',
				CLERK_AUTHORIZED_PARTIES:
					' https://network.shivworks.com/path , https://preview.example.replit.dev/ , https://network.shivworks.com '
			})
		).toEqual([
			'https://shivworks-network.replit.app',
			'https://network.shivworks.com',
			'https://preview.example.replit.dev'
		]);
	});

	it('returns undefined when no origins are configured', () => {
		expect(resolveAuthorizedParties({})).toBeUndefined();
	});
});
