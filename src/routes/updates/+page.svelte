<script lang="ts">
	import { ArrowRight, CalendarClock, Film, RadioTower } from 'lucide-svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const isFree = $derived(data.user.tier === 'free');
	const leadUpdate = $derived(data.updates[0] ?? null);
	const secondaryUpdates = $derived(data.updates.slice(1));
	const latestUpdateLabel = $derived(
		leadUpdate ? formatRelativeDate(leadUpdate.publishedAt) : 'No updates yet'
	);

	function formatRelativeDate(value: number): string {
		const diffMs = Date.now() - value;
		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		if (hours < 24) {
			return 'Today';
		}

		const days = Math.floor(hours / 24);
		if (days === 1) {
			return 'Yesterday';
		}

		if (days < 7) {
			return `${days} days ago`;
		}

		const weeks = Math.floor(days / 7);
		if (weeks < 5) {
			return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
		}

		return formatAbsoluteDate(value);
	}

	function formatAbsoluteDate(value: number): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(value));
	}

	function formatEventDate(value: number | null): string {
		if (!value) {
			return 'Date coming soon';
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Updates | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container">
		<div class="section-heading">
			<p class="eyebrow">Activity / Build log</p>
			<h1>What is being built, shipped, and scheduled.</h1>
			<p>
				{#if isFree}
					These are the build-log entries marked for free access. Paid member briefings will appear
					after upgrade.
				{:else}
					These updates keep members informed while the curriculum and live calendar expand.
				{/if}
			</p>
		</div>

		{#if isFree}
			<div class="status-message upgrade-banner">
				<strong>Free update lane.</strong>
				<span>Upgrade to see the full build log, release notes, and member-only scheduling updates.</span>
				<a class="ghost-link" href="/checkout">Upgrade access</a>
			</div>
		{/if}

		{#if !leadUpdate}
			<div class="card-grid two-up align-start">
				<article class="panel updates-empty">
					<p class="card-eyebrow">No visible briefings yet</p>
					<h2>The free lane is ready.</h2>
					<p>
						As soon as ShivWorks marks a build-log entry for your access lane, it will surface here
						with the same operational summary and next-step routing.
					</p>
				</article>

				<div class="updates-side">
					<article class="panel updates-side-card">
						<p class="eyebrow">Training lane</p>
						<h2>Library visibility is already in place.</h2>
						<p>
							{#if data.courseCounts.available > 0}
								{data.courseCounts.available} course{data.courseCounts.available === 1 ? '' : 's'} are
								ready now, with {data.courseCounts.roadmap} more roadmap block{data.courseCounts.roadmap === 1
									? ''
									: 's'} visible behind them.
							{:else}
								The curriculum shell is visible now, with roadmap blocks ready to promote into live
								training as ShivWorks ships them.
							{/if}
						</p>
						<a class="ghost-link" href="/library">
							Open library
							<ArrowRight size={16} />
						</a>
					</article>

					<article class="panel updates-side-card">
						<p class="eyebrow">Live lane</p>
						<h2>Member events stay attached to the same product shell.</h2>
						<p>
							Use the live page for RSVP state, next session timing, and reminder handling instead of
							bouncing into a separate event workflow.
						</p>
						<a class="ghost-link" href="/live">
							Open live page
							<ArrowRight size={16} />
						</a>
					</article>
				</div>
			</div>
		{:else}
			<div class="updates-layout">
				<article class="panel updates-lead">
					<div class="updates-lead-copy">
						<p class="eyebrow">Latest brief</p>
						<h2>{leadUpdate.title}</h2>
						<p class="updates-lead-body">{leadUpdate.bodyMarkdown}</p>
					</div>

					<div class="updates-meta-row">
						<span class="detail-pill">
							<CalendarClock size={14} />
							{latestUpdateLabel}
						</span>
						<span class="detail-pill muted">{formatAbsoluteDate(leadUpdate.publishedAt)}</span>
						<span class="detail-pill muted">{getAudienceLabel(leadUpdate.audience)}</span>
						{#if leadUpdate.authorName}
							<span class="detail-pill muted">{leadUpdate.authorName}</span>
						{/if}
					</div>

					<div class="updates-signal-grid">
						<div class="updates-signal">
							<span>Visible briefings</span>
							<strong>{data.updates.length}</strong>
							<p>The build log is being staged as one continuous operational lane.</p>
						</div>
						<div class="updates-signal">
							<span>Ready courses</span>
							<strong>{data.courseCounts.available}</strong>
							<p>Training blocks that can be watched right now from the library.</p>
						</div>
						<div class="updates-signal">
							<span>Live sessions</span>
							<strong>{data.eventCounts.live + data.eventCounts.scheduled}</strong>
							<p>Active or upcoming touchpoints that stay tied to the same member state.</p>
						</div>
					</div>
				</article>

				<div class="updates-side">
					<article class="panel updates-side-card">
						<p class="eyebrow">Training lane</p>
						<h2>
							{#if data.courseCounts.available > 0}
								{data.courseCounts.available} course{data.courseCounts.available === 1 ? '' : 's'} ready to
								watch
							{:else}
								Curriculum roadmap is visible
							{/if}
						</h2>
						<p>
							{#if data.courseCounts.available > 0}
								Open the library to move directly into the live modules first, then track the roadmap
								blocks that are still staged behind them.
							{:else}
								The library is already structured. As modules go live, they move from roadmap into the
								watchable lane without changing the member workflow.
							{/if}
						</p>
						<div class="updates-side-stats">
							<div>
								<span>Ready now</span>
								<strong>{data.courseCounts.available}</strong>
							</div>
							<div>
								<span>Roadmap visible</span>
								<strong>{data.courseCounts.roadmap}</strong>
							</div>
						</div>
						<a class="ghost-link" href="/library">
							Open library
							<ArrowRight size={16} />
						</a>
					</article>

					<article class="panel updates-side-card">
						<p class="eyebrow">Live lane</p>
						{#if data.nextEvent}
							<h2>{data.nextEvent.title}</h2>
							<p>
								{#if data.nextEvent.status === 'live'}
									A session is live right now. Use the live page for the active embed, reminder state,
									and the rest of the queue.
								{:else if data.nextEvent.status === 'scheduled'}
									The next visible member touchpoint is on deck. Keep RSVP state and timing inside the
									product instead of switching into an external event flow.
								{:else}
									The most recent visible session has wrapped. Check the live page for what is next and
									watch the build log for follow-up notes.
								{/if}
							</p>
							<div class="updates-side-stats">
								<div>
									<span>Status</span>
									<strong>{data.nextEvent.status === 'live'
										? 'Live now'
										: data.nextEvent.status === 'scheduled'
											? 'Scheduled'
											: 'Ended'}</strong>
								</div>
								<div>
									<span>Timing</span>
									<strong>{formatEventDate(data.nextEvent.startsAt)}</strong>
								</div>
							</div>
						{:else}
							<h2>No session is queued yet.</h2>
							<p>
								The live page is already part of the member shell. As soon as ShivWorks schedules the
								next event, it will slot into the same RSVP and reminder lane.
							</p>
						{/if}
						<a class="ghost-link" href="/live">
							Open live page
							<ArrowRight size={16} />
						</a>
					</article>
				</div>
			</div>

			<div class="section-heading compact updates-archive-heading">
				<div>
					<p class="eyebrow">Archive / Previous briefs</p>
					<h2>What shipped before the current lead update.</h2>
				</div>
				<p>
					Older entries stay in sequence so members can track the operating rhythm instead of reading a
					disconnected announcement feed.
				</p>
			</div>

			<div class="timeline updates-timeline">
				{#if secondaryUpdates.length === 0}
					<article class="panel timeline-item updates-timeline-item">
						<p class="card-eyebrow">Archive is just getting started</p>
						<h2>The lead update is the only visible briefing so far.</h2>
						<p>As ShivWorks publishes the next briefings, they will stack here in reverse chronological order.</p>
					</article>
				{:else}
					{#each secondaryUpdates as item}
						<article class="panel timeline-item updates-timeline-item">
							<div class="updates-timeline-top">
								<div>
									<p class="card-eyebrow">{formatRelativeDate(item.publishedAt)}</p>
									<h2>{item.title}</h2>
								</div>
								<small>{formatAbsoluteDate(item.publishedAt)}</small>
							</div>
							<p>{item.bodyMarkdown}</p>
							<div class="updates-meta-row">
								<span class="detail-pill muted">{getAudienceLabel(item.audience)}</span>
								{#if item.authorName}
									<span class="detail-pill muted">{item.authorName}</span>
								{/if}
							</div>
						</article>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</section>
