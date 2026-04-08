export type MembershipTier = 'free' | 'bronze' | 'vip';
export type PaidMembershipTier = Exclude<MembershipTier, 'free'>;
export type AccessStatus = 'none' | 'active' | 'revoked';
export type ContentAudience = 'free' | 'member' | 'vip';

export const MEMBERSHIP_TIERS = {
	free: {
		code: 'free' as const,
		label: 'Free Access',
		badge: 'Free',
		displayPrice: '$0',
		checkoutLabel: 'Free access',
		description:
			'Preview the ShivWorks Network through free updates, selected roadmap items, and free live touchpoints before upgrading to full member access.',
		highlights: ['Free roadmap previews', 'Selected build-log updates', 'Free live touchpoints']
	},
	bronze: {
		code: 'bronze' as const,
		label: 'Bronze Founding Member',
		badge: 'Bronze',
		displayPrice: '$199-$399',
		checkoutLabel: 'Founding member access',
		description:
			'Full network access to courses, community, livestreams, updates, and the full ShivWorks curriculum as it is released.',
		highlights: [
			'Full curriculum access',
			'Roadshow docu-series access',
			'Bi-monthly livestreams',
			'Member community'
		]
	},
	vip: {
		code: 'vip' as const,
		label: 'VIP Founding Member',
		badge: 'VIP',
		displayPrice: '$599',
		checkoutLabel: 'VIP founding access',
		description:
			'Everything in Bronze, plus a visible VIP distinction, priority booking callouts, and in-product quarterly VIP call requests.',
		highlights: [
			'Everything in Bronze',
			'VIP profile and community badge',
			'Priority booking callout',
			'Quarterly VIP call request access'
		]
	}
} satisfies Record<MembershipTier, { code: MembershipTier; label: string; badge: string; displayPrice: string; checkoutLabel: string; description: string; highlights: string[] }>;

export const PAID_MEMBERSHIP_TIERS = ['bronze', 'vip'] as const satisfies readonly PaidMembershipTier[];

export function isMemberTier(value: unknown): value is MembershipTier {
	return value === 'free' || value === 'bronze' || value === 'vip';
}

export function isPaidMembershipTier(value: unknown): value is PaidMembershipTier {
	return value === 'bronze' || value === 'vip';
}

export function normalizeContentAudience(value: unknown): ContentAudience {
	if (value === 'free') {
		return 'free';
	}

	if (value === 'vip') {
		return 'vip';
	}

	return 'member';
}

export function isPaidMemberTier(value: MembershipTier | null | undefined): value is PaidMembershipTier {
	return value === 'bronze' || value === 'vip';
}

export function canAccessAudience(
	member:
		| {
				tier: MembershipTier | null;
				role?: 'member' | 'admin';
		  }
		| null
		| undefined,
	audience: ContentAudience
): boolean {
	if (member?.role === 'admin') {
		return true;
	}

	switch (audience) {
		case 'free':
			return member?.tier === 'free' || member?.tier === 'bronze' || member?.tier === 'vip';
		case 'member':
			return member?.tier === 'bronze' || member?.tier === 'vip';
		case 'vip':
			return member?.tier === 'vip';
		default:
			return false;
	}
}

export function getAudienceLabel(audience: ContentAudience): string {
	switch (audience) {
		case 'free':
			return 'Free access';
		case 'member':
			return 'Paid members';
		case 'vip':
			return 'VIP only';
		default:
			return 'Paid members';
	}
}
