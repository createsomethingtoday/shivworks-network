<script lang="ts">
	import { Shield, ArrowUpRight, UserRound } from 'lucide-svelte';
	import { isPaidMemberTier } from '$lib/constants/tiers';
	import { PRIMARY_NAV, SHIVWORKS_MAIN_SITE, SITE_NAME } from '$lib/constants/site';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import SignOutButton from '$lib/components/SignOutButton.svelte';

	interface Props {
		user: App.Locals['user'];
		clerkPublishableKey?: string | null;
	}

	let { user, clerkPublishableKey = null }: Props = $props();
	const navItems = $derived(
		user?.tier === 'free' && user.role !== 'admin'
			? PRIMARY_NAV.filter((item) => item.href !== '/community')
			: PRIMARY_NAV
	);
	const showUpgrade = $derived(
		user
			? user.accessStatus !== 'active' || (!isPaidMemberTier(user.tier) && user.role !== 'admin')
			: false
	);
</script>

<header class="site-nav">
	<div class="container nav-inner">
		<a class="brand" href="/">
			<span class="brand-mark">SW</span>
			<span class="brand-copy">
				<strong>{SITE_NAME}</strong>
				<span>Craig Douglas inside the network</span>
			</span>
		</a>

		<nav class="nav-links" aria-label="Primary">
			{#if user?.accessStatus === 'active'}
				{#each navItems as item}
					<a href={item.href}>{item.label}</a>
				{/each}
				{#if user.tier}
					<MembershipBadge tier={user.tier} />
				{/if}
			{:else}
				<a href={SHIVWORKS_MAIN_SITE} target="_blank" rel="noreferrer">
					Back to ShivWorks
					<ArrowUpRight size={14} />
				</a>
			{/if}
		</nav>

		<div class="nav-actions">
			{#if user}
				<a class="ghost-link" href="/settings">
					<UserRound size={16} />
					{user.name}
				</a>
				{#if showUpgrade}
					<a class="btn-secondary" href="/checkout">
						{user.tier === 'free' ? 'Upgrade access' : 'Complete access'}
					</a>
				{/if}
				{#if user.role === 'admin'}
					<a class="ghost-link" href="/admin">
						<Shield size={16} />
						Admin
					</a>
				{/if}
				<SignOutButton publishableKey={clerkPublishableKey} />
			{:else}
				<a class="ghost-link" href="/login">Sign in</a>
				<a class="btn-primary" href="/signup">Create free account</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.site-nav {
		position: sticky;
		top: 0;
		z-index: 30;
		backdrop-filter: blur(18px);
		background: linear-gradient(180deg, rgba(7, 7, 7, 0.94), rgba(7, 7, 7, 0.86));
		border-bottom: 1px solid rgba(209, 178, 122, 0.14);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
	}

	.nav-inner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.9rem;
		padding-bottom: 0.9rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.85rem;
		color: var(--color-fg-primary);
		text-decoration: none;
		flex: 0 0 auto;
	}

	.brand-mark {
		width: 2.65rem;
		height: 2.65rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		background:
			radial-gradient(circle at top left, rgba(209, 178, 122, 0.22), transparent 52%),
			rgba(18, 16, 13, 0.98);
		border: 1px solid rgba(209, 178, 122, 0.24);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
		font-family: var(--font-mono);
		font-size: 0.94rem;
		letter-spacing: 0.14em;
		color: var(--color-accent);
	}

	.brand-copy {
		display: inline-flex;
		flex-direction: column;
		gap: 0.05rem;
	}

	.brand-copy strong {
		font-size: 0.93rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.brand-copy span:last-child {
		font-size: 0.72rem;
		color: var(--color-fg-muted);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex: 1 1 auto;
		justify-content: center;
		flex-wrap: wrap;
		padding: 0.3rem;
		border: 1px solid rgba(209, 178, 122, 0.12);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.02);
	}

	.nav-links a {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
	}

	.nav-links a:hover {
		color: var(--color-fg-primary);
		background: rgba(255, 255, 255, 0.04);
	}

	.nav-actions {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex: 0 0 auto;
	}

	@media (max-width: 880px) {
		.nav-inner {
			flex-wrap: wrap;
		}

		.nav-links {
			order: 3;
			width: 100%;
			justify-content: flex-start;
			padding-top: 0.3rem;
			border-radius: 1.1rem;
		}

		.nav-actions {
			margin-left: auto;
			flex-wrap: wrap;
			justify-content: flex-end;
		}
	}
</style>
