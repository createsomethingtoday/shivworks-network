<script lang="ts">
	import {
		ArrowRight,
		BellRing,
		CalendarClock,
		CheckCircle2,
		Clock3,
		RadioTower
	} from 'lucide-svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function getInitialRsvps() {
		return data.rsvps;
	}

	let rsvps = $state<Record<string, string>>(getInitialRsvps());
	let pendingId = $state<string | null>(null);
	let feedback = $state<string | null>(null);
	const isFree = $derived(data.user.tier === 'free');

	const sortedEvents = $derived.by(() =>
		[...data.events].sort((left, right) => {
			const statusWeight = (status: string) =>
				status === 'live' ? 0 : status === 'scheduled' ? 1 : 2;
			const statusDelta = statusWeight(left.status) - statusWeight(right.status);
			if (statusDelta !== 0) {
				return statusDelta;
			}

			const leftTime = left.startsAt ?? Number.MAX_SAFE_INTEGER;
			const rightTime = right.startsAt ?? Number.MAX_SAFE_INTEGER;

			if (left.status === 'ended' && right.status === 'ended') {
				return rightTime - leftTime;
			}

			return leftTime - rightTime;
		})
	);

	const spotlightEvent = $derived(sortedEvents[0] ?? null);
	const secondaryEvents = $derived(
		spotlightEvent ? sortedEvents.filter((event) => event.id !== spotlightEvent.id) : []
	);
	const liveCount = $derived(sortedEvents.filter((event) => event.status === 'live').length);
	const scheduledCount = $derived(
		sortedEvents.filter((event) => event.status === 'scheduled').length
	);
	const endedCount = $derived(sortedEvents.filter((event) => event.status === 'ended').length);
	const reminderCount = $derived(
		Object.values(rsvps).filter((status) => status === 'going').length
	);
	const identityStats = $derived.by(() => [
		{ label: 'Visible queue', value: String(sortedEvents.length) },
		{ label: 'Live now', value: String(liveCount) },
		{ label: 'Reminders', value: String(reminderCount) }
	]);

	function formatEventDate(value: number | null): string {
		return value ? new Date(value).toLocaleString() : 'Date coming soon';
	}

	function getEventStatusLabel(status: 'scheduled' | 'live' | 'ended'): string {
		switch (status) {
			case 'live':
				return 'Live now';
			case 'ended':
				return 'Ended';
			default:
				return 'Scheduled';
		}
	}

	function canRsvpEvent(status: 'scheduled' | 'live' | 'ended'): boolean {
		return status !== 'ended';
	}

	function getRsvpLabel(eventId: string): string {
		if (pendingId === eventId) {
			return 'Saving…';
		}

		return rsvps[eventId] === 'going' ? 'Reminder set' : 'RSVP / remind me';
	}

	function getDetailLabel(event: PageData['events'][number]): string {
		return event.eventKind === 'vip_call' ? 'Open booking' : 'Open event details';
	}

	async function rsvp(eventId: string) {
		pendingId = eventId;
		feedback = null;
		try {
			const response = await fetch(`/api/events/${eventId}/rsvp`, { method: 'POST' });
			const result = await response.json();
			if (!response.ok || !result.success) {
				feedback = result.error || 'Unable to save RSVP.';
				return;
			}
			rsvps = { ...rsvps, [eventId]: 'going' };
			feedback = 'You are on the reminder list.';
		} catch (error) {
			console.error('RSVP error', error);
			feedback = 'Unable to save RSVP.';
		} finally {
			pendingId = null;
		}
	}
</script>

<svelte:head>
	<title>Live | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container">
		<div class="section-heading">
			<p class="eyebrow">Live / Upcoming events</p>
			<h1>Livestreams and member touchpoints.</h1>
			<p>
				{#if isFree}
					The free lane shows only the sessions marked for free access. Upgrade when you want the
					full member calendar and private-event routing.
				{:else}
					The live page now centers the next active session, your reminder state, and the rest of the
					event queue without forcing members to scan a flat list.
				{/if}
			</p>
		</div>

		{#if feedback}
			<div class="status-message">{feedback}</div>
		{/if}

		{#if isFree}
			<div class="status-message upgrade-banner">
				<strong>Free live access.</strong>
				<span>
					Only the free touchpoints are visible here. Paid membership unlocks the broader livestream
					schedule.
				</span>
				<a class="ghost-link" href="/checkout">Upgrade access</a>
			</div>
		{/if}

		{#if sortedEvents.length === 0}
			<article class="panel">
				<p class="card-eyebrow">No free events scheduled</p>
				<h2>The live lane is quiet for now.</h2>
				<p>
					When ShivWorks schedules a free-access session, it will appear here with RSVP and reminder
					support.
				</p>
			</article>
		{:else}
			<div class="live-layout">
				<article class="panel live-primary">
					{#if spotlightEvent}
						<div class="live-primary-header">
							<p class="eyebrow">
								{spotlightEvent.status === 'live'
									? 'Live now'
									: spotlightEvent.status === 'scheduled'
										? 'Next session'
										: 'Most recent session'}
							</p>
							<h2>{spotlightEvent.title}</h2>
							<p>{spotlightEvent.description}</p>
						</div>

						<div class="live-status-grid">
							<div class="live-status-card">
								<span>Live now</span>
								<strong>{liveCount}</strong>
							</div>
							<div class="live-status-card">
								<span>Upcoming</span>
								<strong>{scheduledCount}</strong>
							</div>
							<div class="live-status-card">
								<span>Reminders set</span>
								<strong>{reminderCount}</strong>
							</div>
						</div>

						<div class="live-spotlight-meta">
							<span class="detail-pill muted">
								<CalendarClock size={14} />
								{formatEventDate(spotlightEvent.startsAt)}
							</span>
							{#if spotlightEvent.endsAt}
								<span class="detail-pill muted">
									<Clock3 size={14} />
									Ends {formatEventDate(spotlightEvent.endsAt)}
								</span>
							{/if}
							<span class="detail-pill muted">
								{getAudienceLabel(spotlightEvent.accessTier)}
							</span>
							<span
								class:ended={spotlightEvent.status === 'ended'}
								class:live={spotlightEvent.status === 'live'}
								class="live-status-pill"
							>
								{getEventStatusLabel(spotlightEvent.status)}
							</span>
						</div>

						{#if spotlightEvent.status === 'live' && spotlightEvent.embedUrl}
							<div class="embed-shell">
								<iframe title={spotlightEvent.title} src={spotlightEvent.embedUrl} loading="lazy"></iframe>
							</div>
						{:else}
							<div class="live-placeholder">
								{#if spotlightEvent.status === 'scheduled'}
									<RadioTower size={20} />
									<strong>This session will go live here.</strong>
									<p>
										The embed will replace this placeholder when ShivWorks marks the session live.
									</p>
								{:else}
									<CheckCircle2 size={20} />
									<strong>This session has wrapped.</strong>
									<p>
										Use the event queue to track what is next, or follow the build log for any recap
										and follow-up material.
									</p>
								{/if}
							</div>
						{/if}

						<div class="event-actions">
							{#if canRsvpEvent(spotlightEvent.status)}
								<button
									class="btn-secondary"
									disabled={pendingId === spotlightEvent.id}
									onclick={() => rsvp(spotlightEvent.id)}
								>
									<BellRing size={16} />
									{getRsvpLabel(spotlightEvent.id)}
								</button>
							{/if}
							{#if spotlightEvent.bookingUrl}
								<a
									class="ghost-link"
									href={spotlightEvent.bookingUrl}
									target="_blank"
									rel="noreferrer"
								>
									{getDetailLabel(spotlightEvent)}
								</a>
							{/if}
						</div>
					{/if}
				</article>

				<div class="live-side">
					<MemberIdentityPanel
						user={data.user}
						surface="live"
						stats={identityStats}
						compact
					/>

					<article class="panel live-readiness-panel">
						<p class="eyebrow">Your status</p>
						<h2>Event readiness</h2>
						<div class="live-readiness-grid">
							<div class="live-readiness-item">
								<span>Reminder list</span>
								<strong>
									{#if reminderCount > 0}
										{reminderCount} active
									{:else}
										No reminders
									{/if}
								</strong>
							</div>
							<div class="live-readiness-item">
								<span>Visible queue</span>
								<strong>{sortedEvents.length} sessions</strong>
							</div>
							<div class="live-readiness-item">
								<span>Completed</span>
								<strong>{endedCount} archived</strong>
							</div>
						</div>
						<p class="live-readiness-copy">
							{#if reminderCount > 0}
								Your reminder state is already set for {reminderCount} event{reminderCount === 1 ? '' : 's'}.
							{:else}
								Set reminders on the sessions that matter so the live lane becomes your operational calendar.
							{/if}
						</p>
					</article>

					<article class="panel">
						<div class="section-heading compact">
							<p class="eyebrow">Event queue</p>
							<h2>What follows next</h2>
							<p>{secondaryEvents.length} additional session{secondaryEvents.length === 1 ? '' : 's'} visible.</p>
						</div>

						<div class="live-queue">
							{#if secondaryEvents.length === 0}
								<div class="live-queue-item empty">
									<div>
										<p class="card-eyebrow">Queue clear</p>
										<strong>No additional events are queued.</strong>
										<p>The spotlight session above is currently the only visible event in this lane.</p>
									</div>
								</div>
							{:else}
								{#each secondaryEvents as event}
									<div class="live-queue-item">
										<div>
											<p class="card-eyebrow">{getEventStatusLabel(event.status)}</p>
											<strong>{event.title}</strong>
											<p>{event.description}</p>
										</div>
										<div class="live-queue-actions">
											<span class="detail-pill muted">{formatEventDate(event.startsAt)}</span>
											<span
												class:ended={event.status === 'ended'}
												class:live={event.status === 'live'}
												class="live-status-pill"
											>
												{getEventStatusLabel(event.status)}
											</span>
											{#if canRsvpEvent(event.status)}
												<button
													class="btn-secondary live-queue-button"
													disabled={pendingId === event.id}
													onclick={() => rsvp(event.id)}
												>
													<BellRing size={16} />
													{getRsvpLabel(event.id)}
												</button>
											{/if}
											{#if event.bookingUrl}
												<a
													class="ghost-link"
													href={event.bookingUrl}
													target="_blank"
													rel="noreferrer"
												>
													{getDetailLabel(event)}
													<ArrowRight size={16} />
												</a>
											{/if}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</article>
				</div>
			</div>
		{/if}
	</div>
</section>
