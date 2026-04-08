<script lang="ts">
	import { ArrowRight, CheckCircle2, Film, MessageSquareText, RadioTower } from 'lucide-svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import {
		MEMBERSHIP_TIERS,
		PAID_MEMBERSHIP_TIERS,
		type PaidMembershipTier
	} from '$lib/constants/tiers';
	import MembershipBadge from '$lib/components/MembershipBadge.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let isLoading = $state<PaidMembershipTier | null>(null);
	let error = $state<string | null>(null);
	const currentTier = $derived(data.user.tier ? MEMBERSHIP_TIERS[data.user.tier] : null);
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
	const identityStats = $derived.by(() => [
		{ label: 'Current lane', value: currentTier?.badge ?? 'None' },
		{ label: 'Paid tiers', value: String(PAID_MEMBERSHIP_TIERS.length) },
		{ label: 'Next stop', value: redirectLabel }
	]);

	function getTierLaneCopy(tier: PaidMembershipTier): string {
		return tier === 'vip' ? 'Highest-touch lane' : 'Core member lane';
	}

	async function startCheckout(tier: PaidMembershipTier) {
		isLoading = tier;
		error = null;

		try {
			const response = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tier,
					returnTo: data.redirectTo
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success || !result.data?.url) {
				error = result.error || 'Unable to start checkout.';
				return;
			}
			window.location.href = result.data.url;
		} catch (checkoutError) {
			console.error('Checkout error', checkoutError);
			error = 'Unable to reach Stripe right now.';
		} finally {
			isLoading = null;
		}
	}
</script>

<svelte:head>
	<title>Checkout | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container">
		<div class="upgrade-layout">
			<div class="stack-column">
				<MemberIdentityPanel user={data.user} surface="upgrade" stats={identityStats} />

				<article class="panel upgrade-command-panel">
					<div class="section-heading compact">
						<div>
							<p class="eyebrow">Upgrade command</p>
							<h2>What changes after payment.</h2>
							<p>
								Stripe checkout unlocks the broader ShivWorks member environment, then hands you back
								into <strong>{redirectLabel}</strong> so the upgrade does not break route context.
							</p>
						</div>
						<div class="inline-membership">
							<span>Current state</span>
							<MembershipBadge tier={data.user.tier} />
						</div>
					</div>

					<div class="upgrade-signal-grid">
						<article class="upgrade-signal-card">
							<Film size={18} />
							<strong>Full curriculum lane</strong>
							<p>Move from preview-level access into the full release sequence as ShivWorks ships modules.</p>
						</article>
						<article class="upgrade-signal-card">
							<MessageSquareText size={18} />
							<strong>Private community</strong>
							<p>Enter the paid discussion lane without leaving the same network shell you are already using now.</p>
						</article>
						<article class="upgrade-signal-card">
							<RadioTower size={18} />
							<strong>Member touchpoints</strong>
							<p>Paid access opens the broader live schedule, and VIP extends that lane into quarterly call requests.</p>
						</article>
					</div>

					<div class="upgrade-flow">
						<div class="stack-item">
							<CheckCircle2 size={18} />
							<div>
								<strong>1. Complete Stripe checkout</strong>
								<p>Choose the lane below and finish payment without re-entering product context later.</p>
							</div>
						</div>
						<div class="stack-item">
							<CheckCircle2 size={18} />
							<div>
								<strong>2. Access sync and welcome handoff</strong>
								<p>The product confirms the entitlement, then moves you through the welcome checkpoint.</p>
							</div>
						</div>
						<div class="stack-item">
							<ArrowRight size={18} />
							<div>
								<strong>3. Continue into {redirectLabel}</strong>
								<p>The route you were already trying to reach stays preserved through the upgrade path.</p>
							</div>
						</div>
					</div>
				</article>
			</div>

			<article class="panel tier-selection-panel">
				<div class="section-heading">
					<p class="eyebrow">Finalize access</p>
					<h1>Choose the access level that matches your membership.</h1>
					<p>
						You are signed in as <strong>{data.user.name}</strong>. Complete Stripe checkout to unlock
						the {data.user.tier === 'free' ? 'full paid-member ShivWorks Network.' : 'full ShivWorks Network.'}
					</p>
				</div>

				{#if error}
					<div class="status-message error">{error}</div>
				{/if}

				<div class="card-grid two-up upgrade-tier-grid">
					{#each PAID_MEMBERSHIP_TIERS as code}
						{@const tier = MEMBERSHIP_TIERS[code]}
						<article class:vip-tier={tier.code === 'vip'} class="panel tier-card">
							<div class="tier-card-top">
								<div>
									<p class="eyebrow">{tier.badge}</p>
									<h2>{tier.label}</h2>
								</div>
								<span class="detail-pill muted">{getTierLaneCopy(tier.code)}</span>
							</div>

							<p class="tier-price">{tier.displayPrice}</p>
							<p>{tier.description}</p>

							<div class="tier-card-outcome">
								<span>After payment</span>
								<strong>Continue to {redirectLabel}</strong>
								<p>{tier.checkoutLabel} stays attached to this signed-in account.</p>
							</div>

							<ul class="feature-list">
								{#each tier.highlights as item}
									<li>{item}</li>
								{/each}
							</ul>

							<div class="tier-card-actions">
								<button
									class="btn-primary"
									disabled={isLoading !== null}
									onclick={() => startCheckout(tier.code)}
								>
									{isLoading === tier.code ? 'Redirecting…' : `Choose ${tier.badge}`}
								</button>
								<p class="tier-card-note">
									{tier.code === 'vip'
										? 'VIP extends the full member lane with visible distinction and quarterly call routing.'
										: 'Bronze opens the full member shell without adding the VIP-specific call workflow.'}
								</p>
							</div>
						</article>
					{/each}
				</div>
			</article>
		</div>
	</div>
</section>
