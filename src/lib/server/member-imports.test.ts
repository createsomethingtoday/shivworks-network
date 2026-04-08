import { describe, expect, it } from 'vitest';
import { normalizeImportedTier, parseImportedMemberCsv } from './member-imports';

describe('normalizeImportedTier', () => {
	it('maps known tier strings and product names', () => {
		expect(normalizeImportedTier('VIP Founding Member')).toBe('vip');
		expect(normalizeImportedTier('Bronze Founding Member')).toBe('bronze');
		expect(normalizeImportedTier('free access')).toBe('free');
		expect(normalizeImportedTier('')).toBeNull();
	});
});

describe('parseImportedMemberCsv', () => {
	it('parses common purchaser export columns', () => {
		const result = parseImportedMemberCsv(`email,first_name,last_name,product,order_id
member@example.com,Craig,Douglas,VIP Founding Member,1001
bronze@example.com,Student,One,Bronze Founding Member,1002`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			{
				email: 'member@example.com',
				name: 'Craig Douglas',
				tier: 'vip',
				accessStatus: 'active',
				role: 'member',
				sourceRef: '1001'
			},
			{
				email: 'bronze@example.com',
				name: 'Student One',
				tier: 'bronze',
				accessStatus: 'active',
				role: 'member',
				sourceRef: '1002'
			}
		]);
	});

	it('reports duplicate or invalid rows', () => {
		const result = parseImportedMemberCsv(`email,tier
invalid,bronze
member@example.com,vip
member@example.com,bronze`);

		expect(result.rows).toHaveLength(1);
		expect(result.errors).toEqual([
			'Row 2: valid email is required.',
			'Row 4: duplicate email member@example.com.'
		]);
	});
});
