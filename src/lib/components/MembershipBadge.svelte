<script lang="ts">
	import { MEMBERSHIP_TIERS, type MembershipTier } from '$lib/constants/tiers';

	interface Props {
		tier: MembershipTier | null;
	}

	let { tier }: Props = $props();
	const label = $derived(tier ? MEMBERSHIP_TIERS[tier].badge : 'Pending');
</script>

<span class:free={tier === 'free'} class:vip={tier === 'vip'} class:bronze={tier === 'bronze'} class="membership-badge">
	{label}
</span>

<style>
	.membership-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.38rem 0.78rem;
		border-radius: 0.8rem;
		background: linear-gradient(180deg, rgba(209, 178, 122, 0.14), rgba(209, 178, 122, 0.08));
		color: var(--color-accent);
		border: 1px solid rgba(209, 178, 122, 0.3);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-weight: 700;
	}

	.membership-badge.vip {
		background: linear-gradient(180deg, rgba(155, 103, 60, 0.22), rgba(155, 103, 60, 0.1));
		color: #e9bf93;
		border-color: rgba(155, 103, 60, 0.38);
	}
	.membership-badge.bronze {
		background: linear-gradient(180deg, rgba(209, 178, 122, 0.14), rgba(209, 178, 122, 0.08));
	}

	.membership-badge.free {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
		color: var(--color-fg-secondary);
		border-color: rgba(255, 255, 255, 0.14);
	}
</style>
