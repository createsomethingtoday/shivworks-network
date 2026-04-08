<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		ArrowRight,
		CheckCircle2,
		Clock3,
		Film,
		MessageSquareText,
		RadioTower,
		Video
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import { SUPPORT_EMAIL } from '$lib/constants/site';
	import { MEMBERSHIP_TIERS } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type WelcomeStep = {
		href: string;
		kind: 'redirect' | 'library' | 'live' | 'community' | 'vip';
		title: string;
		copy: string;
	};

	let { data }: Props = $props();
	let polling = $state(false);
	const redirectLabel = $derived.by(() => {
		switch (data.redirectTo) {
			case '/library':
				return 'Library';
			case '/community':
				return 'Community';
			case '/live':
				return 'Live lane';
			case '/vip-calls':
				return 'VIP calls';
			default:
				return 'Dashboard';
		}
	});
	const nextSteps = $derived.by(() => {
		const steps: WelcomeStep[] = [
			{
				href: data.redirectTo,
				kind: 'redirect' as const,
				title: `Continue to ${redirectLabel}`,
				copy: 'The route you were already trying to reach stays first in line after checkout.'
			},
			{
				href: '/library',
				kind: 'library' as const,
				title: 'Open the library',
				copy: 'Move directly into the curriculum lane and the currently live modules.'
			},
			{
				href: '/live',
				kind: 'live' as const,
				title: 'Check live touchpoints',
				copy: 'Confirm the next session, RSVP state, and any current member event activity.'
			}
		];

		if (data.user.tier === 'vip') {
			steps.push({
				href: '/vip-calls',
				kind: 'vip' as const,
				title: 'Review VIP call lane',
				copy: 'Use the premium workflow for requests, confirmed booking, and ongoing quarterly call continuity.'
			});
		} else if (data.user.tier !== 'free') {
			steps.push({
				href: '/community',
				kind: 'community' as const,
				title: 'Open the community',
				copy: 'Step into the private discussion lane without leaving the same product shell.'
			});
		}

		return steps.filter(
			(step, index, all) => all.findIndex((candidate) => candidate.href === step.href) === index
		);
	});
	const identityStats = $derived.by(() =>
		data.ready
			? [
					{
						label: 'Access',
						value: data.user.tier ? MEMBERSHIP_TIERS[data.user.tier].badge : 'Active'
					},
					{ label: 'Next stop', value: redirectLabel },
					{ label: 'Routes live', value: String(nextSteps.length) }
				]
			: [
					{ label: 'Checkout', value: 'Done' },
					{ label: 'Sync', value: 'Pending' },
					{ label: 'Next stop', value: redirectLabel }
				]
	);

	onMount(() => {
		if (data.ready) return;

		let active = true;
		let attempts = 0;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const poll = async () => {
			if (!active || data.ready || attempts >= 10) return;

			attempts += 1;
			polling = true;

			try {
				await invalidateAll();
			} catch (error) {
				console.error('Failed to refresh welcome status', error);
			} finally {
				polling = false;
			}

			if (active && !data.ready && attempts < 10) {
				timeoutId = setTimeout(poll, 4000);
			}
		};

		timeoutId = setTimeout(poll, 4000);

		return () => {
			active = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});

	async function refreshStatus() {
		polling = true;
		try {
			await invalidateAll();
		} catch (error) {
			console.error('Failed to refresh welcome status', error);
		} finally {
			polling = false;
		}
	}
</script>

<svelte:head>
	<title>Welcome | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container settings-shell">
		<div class="welcome-layout">
			<div class="stack-column">
				<MemberIdentityPanel
					user={data.user}
					surface={data.ready ? 'welcome' : 'upgrade'}
					stats={identityStats}
				/>

				<div class="panel welcome-panel welcome-status-panel">
					{#if data.ready}
						<div class="status-icon success">
							<CheckCircle2 size={28} />
						</div>
						<p class="eyebrow">Access granted</p>
						<h1>You are in.</h1>
						<p>
							Your membership is active and your account is now routed into the full ShivWorks
							Network. Continue directly into <strong>{redirectLabel}</strong> or move into the
							other member lanes below.
						</p>
						<div class="inline-membership">
							<span>Current membership</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
						<div class="welcome-actions">
							<a class="btn-primary" href={data.redirectTo}>
								Continue to {redirectLabel}
								<ArrowRight size={16} />
							</a>
							<a class="btn-secondary" href="/library">Open library</a>
							{#if data.user.tier === 'vip'}
								<a class="ghost-link" href="/vip-calls">Open VIP lane</a>
							{:else if data.user.tier !== 'free'}
								<a class="ghost-link" href="/community">Open community</a>
							{/if}
						</div>
					{:else}
						<div class="status-icon pending">
							<Clock3 size={28} />
						</div>
						<p class="eyebrow">Processing</p>
						<h1>Your access is still syncing.</h1>
						<p>
							Stripe completed successfully, but the webhook has not marked your membership active yet.
							The page will keep checking automatically for the next minute. If this does not resolve
							quickly, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
						</p>
						<div class="welcome-actions">
							<button class="btn-secondary" type="button" onclick={refreshStatus} disabled={polling}>
								{polling ? 'Checking…' : 'Refresh access'}
							</button>
							<a class="ghost-link" href={`/checkout?redirect=${encodeURIComponent(data.redirectTo)}`}>
								Back to checkout
							</a>
						</div>
					{/if}
				</div>
			</div>

			<article class="panel welcome-next-panel">
				{#if data.ready}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Next moves</p>
							<h2>Keep moving inside the same product shell.</h2>
							<p>
								The upgrade is done. Use the routes below as the immediate handoff back into the live
								member environment.
							</p>
						</div>
						<div class="inline-membership">
							<span>Access lane</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
					</div>

					<div class="welcome-next-grid">
						{#each nextSteps as step}
							<a class="welcome-route-card" href={step.href}>
								{#if step.kind === 'library'}
									<Film size={18} />
								{:else if step.kind === 'community'}
									<MessageSquareText size={18} />
								{:else if step.kind === 'live'}
									<RadioTower size={18} />
								{:else if step.kind === 'vip'}
									<Video size={18} />
								{:else}
									<ArrowRight size={18} />
								{/if}
								<div>
									<p class="card-eyebrow">Next route</p>
									<strong>{step.title}</strong>
									<p>{step.copy}</p>
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Sync status</p>
							<h2>What happens next.</h2>
							<p>
								The handoff is waiting on the membership sync. The page keeps checking automatically,
								but the underlying route after upgrade is already locked in.
							</p>
						</div>
					</div>

					<div class="welcome-sync-list">
						<div class="stack-item">
							<CheckCircle2 size={18} />
							<div>
								<strong>Stripe checkout completed</strong>
								<p>Your payment is already done. No second purchase is needed.</p>
							</div>
						</div>
						<div class="stack-item">
							<Clock3 size={18} />
							<div>
								<strong>Membership sync pending</strong>
								<p>The webhook is still updating the account before the product opens the full lane.</p>
							</div>
						</div>
						<div class="stack-item">
							<ArrowRight size={18} />
							<div>
								<strong>Next route preserved</strong>
								<p>Once the sync clears, the handoff will continue into <strong>{redirectLabel}</strong>.</p>
							</div>
						</div>
					</div>
				{/if}
			</article>
		</div>
	</div>
</section>
