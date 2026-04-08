<script lang="ts">
	import {
		ArrowRight,
		CalendarClock,
		CalendarDays,
		Film,
		MessageSquareText,
		RadioTower,
		SquareArrowOutUpRight
	} from 'lucide-svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import CourseCard from '$lib/components/CourseCard.svelte';
	import MemberIdentityPanel from '$lib/components/MemberIdentityPanel.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const isFree = $derived(data.user.tier === 'free');
	const availableCourseCount = $derived(data.courseCounts.available);
	const roadmapCourseCount = $derived(data.courseCounts.roadmap);
	const roadshowSeries = $derived(data.series[0] ?? null);
	const leadUpdate = $derived(data.updates[0] ?? null);
	const archivedUpdates = $derived(data.updates.slice(1));
	const primaryResource = $derived(data.links[0] ?? null);
	const secondaryResources = $derived(data.links.slice(1));
	const vipResourceVisible = $derived(data.links.some((link) => link.audience === 'vip'));
	const nextEvent = $derived.by(() =>
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
		})[0] ?? null
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

	function getResourceLane(linkKey: string): string {
		if (linkKey.includes('vip')) {
			return 'VIP path';
		}

		if (linkKey.includes('shop') || linkKey.includes('products')) {
			return 'Gear';
		}

		if (linkKey.includes('book') || linkKey.includes('course')) {
			return 'Training';
		}

		return 'Resource';
	}

	function getSeriesStatusLabel(status: 'coming_soon' | 'available' | 'archived'): string {
		switch (status) {
			case 'available':
				return 'Available now';
			case 'archived':
				return 'Archived';
			default:
				return 'Episodes staging';
		}
	}

	function getSeriesStatusCopy(status: 'coming_soon' | 'available' | 'archived'): string {
		switch (status) {
			case 'available':
				return 'Episodes are live inside the member series lane now.';
			case 'archived':
				return 'This series run has been retained as archive material.';
			default:
				return 'The Roadshow track is visible now and will promote into a live documentary lane as ShivWorks ships it.';
		}
	}
</script>

<svelte:head>
	<title>Dashboard | ShivWorks Network</title>
</svelte:head>

<section class="section-block hero-section">
	<div class="container">
		<div class="hero-banner panel dashboard-slab">
			<div>
				<p class="eyebrow">Operational brief</p>
				<h1>Welcome back, {data.user.name}.</h1>
				<p>
					{#if isFree}
						You are inside the free access lane. Review the preview curriculum, free briefings, and
						open live touchpoints here, then upgrade when you want the full member environment.
					{:else}
						This is the training-side home for release progress, live session access, and the member
						community without bouncing between separate systems.
					{/if}
				</p>

				<div class="hero-meta">
					<a class="btn-secondary" href="/library">Open library</a>
					{#if isFree}
						<a class="btn-primary" href="/checkout">Upgrade access</a>
					{/if}
					<a class="ghost-link" href="/settings">Manage profile</a>
				</div>
			</div>

			<MemberIdentityPanel
				user={data.user}
				surface="dashboard"
				updatesCount={data.updates.length}
				availableCourseCount={availableCourseCount}
				eventsCount={data.events.length}
			/>
		</div>

			{#if isFree}
				<div class="status-message upgrade-banner">
					<strong>Free access is live.</strong>
					<span>
					You are seeing only the free lane right now. Upgrade to Bronze or VIP to unlock the full
					curriculum, private community, and paid-member live sessions.
				</span>
					<a class="ghost-link" href="/checkout">View upgrade options</a>
				</div>
			{/if}

			{#if data.resumeItem}
				<a class="panel resume-panel" href={`/library/${data.resumeItem.courseSlug}?module=${data.resumeItem.moduleId}`}>
					<p class="eyebrow">Continue training</p>
					<h2>{data.resumeItem.courseTitle}</h2>
					<p>
						{data.resumeItem.moduleTitle} ·
						{#if data.resumeItem.completedAt}
							Completed on this account
						{:else if data.resumeItem.durationSeconds}
							{Math.round((data.resumeItem.currentSeconds / data.resumeItem.durationSeconds) * 100)}% watched
						{:else}
							Resume from {Math.floor(data.resumeItem.currentSeconds / 60)
								.toString()
								.padStart(2, '0')}:{(data.resumeItem.currentSeconds % 60).toString().padStart(2, '0')}
						{/if}
					</p>
					<span class="ghost-link">Resume module</span>
				</a>
			{/if}

			<div class="card-grid dashboard-metrics">
			<a class="panel metric-card" href="/updates">
				<CalendarDays size={18} />
				<strong>{data.updates.length} recent updates</strong>
				<p>Read the current release brief and track what changed inside the network.</p>
			</a>
			<a class="panel metric-card" href="/library">
				<Film size={18} />
				<strong>
					{#if availableCourseCount > 0}
						{availableCourseCount} courses ready now
					{:else}
						Curriculum roadmap
					{/if}
				</strong>
				<p>
					{#if availableCourseCount > 0}
						Open the playable training blocks first, then track the rest of the roadmap in sequence.
					{:else}
						Review the visible curriculum structure and track what is landing next.
					{/if}
				</p>
			</a>
			<a class="panel metric-card" href="/live">
				<RadioTower size={18} />
				<strong>{data.events.length} live touchpoints</strong>
				<p>Keep livestream access, RSVP state, and event timing inside one member workflow.</p>
			</a>
			{#if isFree}
				<a class="panel metric-card" href="/checkout">
					<MessageSquareText size={18} />
					<strong>Upgrade for community access</strong>
					<p>Free access keeps the product shell open, but private discussion stays inside the paid member lane.</p>
				</a>
			{:else}
				<a class="panel metric-card" href="/community">
					<MessageSquareText size={18} />
					<strong>Private community</strong>
					<p>Move directly into the discussion layer without leaving the ShivWorks product context.</p>
				</a>
			{/if}
		</div>
	</div>
</section>

<section class="section-block">
	<div class="container">
		<div class="section-heading compact">
			<p class="eyebrow">Latest updates</p>
			<h2>Build log</h2>
			<a href="/updates" class="ghost-link">
				View all updates
				<ArrowRight size={16} />
			</a>
		</div>

		{#if !leadUpdate}
			<article class="panel dashboard-update-empty">
				<p class="card-eyebrow">No visible briefings yet</p>
				<h3>Free briefings will appear here.</h3>
				<p>
					Once ShivWorks publishes a visible update for this access lane, it will land here as the lead
					briefing instead of a generic announcement card.
				</p>
			</article>
		{:else}
			<div class="dashboard-updates-layout">
				<article class="panel dashboard-update-lead">
					<div class="dashboard-update-copy">
						<p class="eyebrow">Lead update</p>
						<h3>{leadUpdate.title}</h3>
						<p class="dashboard-update-body">{leadUpdate.bodyMarkdown}</p>
					</div>

					<div class="updates-meta-row">
						<span class="detail-pill">
							<CalendarClock size={14} />
							{formatRelativeDate(leadUpdate.publishedAt)}
						</span>
						<span class="detail-pill muted">{formatAbsoluteDate(leadUpdate.publishedAt)}</span>
						<span class="detail-pill muted">{getAudienceLabel(leadUpdate.audience)}</span>
						{#if leadUpdate.authorName}
							<span class="detail-pill muted">{leadUpdate.authorName}</span>
						{/if}
					</div>

					<div class="dashboard-update-actions">
						<a class="btn-secondary" href="/updates">
							Open full build log
							<ArrowRight size={16} />
						</a>
						<a class="ghost-link" href="/library">Open library</a>
						<a class="ghost-link" href="/live">Open live page</a>
					</div>
				</article>

				<div class="dashboard-updates-side">
					<article class="panel dashboard-update-context">
						<p class="eyebrow">Operational handoff</p>
						<h3>What to open next.</h3>
						<div class="dashboard-update-stats">
							<div>
								<span>Ready courses</span>
								<strong>{availableCourseCount}</strong>
								<p>
									{#if availableCourseCount > 0}
										Open the live training blocks first.
									{:else}
										The curriculum shell is staged and waiting for the next release.
									{/if}
								</p>
							</div>
							<div>
								<span>Next event</span>
								<strong>
									{#if nextEvent}
										{nextEvent.status === 'live'
											? 'Live now'
											: nextEvent.status === 'scheduled'
												? 'Scheduled'
												: 'Wrapped'}
									{:else}
										Quiet
									{/if}
								</strong>
								<p>
									{#if nextEvent}
										{formatEventDate(nextEvent.startsAt)}
									{:else}
										The next visible session will appear in the live lane.
									{/if}
								</p>
							</div>
						</div>
					</article>

					<article class="panel dashboard-update-archive">
						<p class="eyebrow">Archive</p>
						{#if archivedUpdates.length === 0}
							<p class="dashboard-update-archive-empty">
								The lead update is the only visible briefing so far.
							</p>
						{:else}
							<div class="dashboard-update-list">
								{#each archivedUpdates as item}
									<a class="dashboard-update-row" href="/updates">
										<div>
											<p class="card-eyebrow">{formatRelativeDate(item.publishedAt)}</p>
											<strong>{item.title}</strong>
										</div>
										<small>{formatAbsoluteDate(item.publishedAt)}</small>
									</a>
								{/each}
							</div>
						{/if}
					</article>
				</div>
			</div>
		{/if}
	</div>
</section>

<section class="section-block">
	<div class="container">
		<div class="section-heading compact">
			<p class="eyebrow">Curriculum</p>
			<h2>Available first inside the library</h2>
			<a href="/library" class="ghost-link">
				Open library
				<ArrowRight size={16} />
			</a>
		</div>
		<div class="card-grid">
			{#if data.courses.length === 0}
				<article class="panel">
					<p class="card-eyebrow">Upgrade path</p>
					<h3>The full curriculum opens after upgrade.</h3>
					<p>The free lane only shows selected roadmap items. Move to Bronze or VIP when you are ready for the complete curriculum view.</p>
					<a class="ghost-link" href="/checkout">Upgrade access</a>
				</article>
				{:else}
					{#each data.courses as course}
						<CourseCard {course} href={`/library/${course.slug}`} />
					{/each}
				{/if}
			</div>
		</div>
</section>

<section class="section-block">
	<div class="container card-grid two-up">
		<div class="panel roadshow-panel">
			{#if roadshowSeries}
				<div class="roadshow-header">
					<div>
						<p class="eyebrow">Roadshow / secondary track</p>
						<h2>{roadshowSeries.title}</h2>
					</div>
					<span class="detail-pill muted">{getAudienceLabel(roadshowSeries.accessTier)}</span>
				</div>
				<p>{roadshowSeries.description}</p>

				<div class="updates-meta-row">
					<span class="detail-pill">{getSeriesStatusLabel(roadshowSeries.status)}</span>
					<span class="detail-pill muted">Documentary lane</span>
					<span class="detail-pill muted">Runs beside the core curriculum</span>
				</div>

				<div class="roadshow-grid">
					<div>
						<span>Status</span>
						<strong>{getSeriesStatusLabel(roadshowSeries.status)}</strong>
						<p>{getSeriesStatusCopy(roadshowSeries.status)}</p>
					</div>
					<div>
						<span>Relationship</span>
						<strong>
							{availableCourseCount} live course{availableCourseCount === 1 ? '' : 's'}
						</strong>
						<p>
							The Roadshow track adds field context around the same network that already has
							{#if roadmapCourseCount > 0}
								{` ${roadmapCourseCount} roadmap block${roadmapCourseCount === 1 ? '' : 's'} queued next.`}
							{:else}
								its live training lane open now.
							{/if}
						</p>
					</div>
					<div>
						<span>Next move</span>
						<strong>Track inside the library</strong>
						<p>
							Use the library to watch this series shift from staged documentary lane into active member
							episodes without changing surfaces.
						</p>
					</div>
				</div>

				<div class="roadshow-actions">
					<a class="btn-secondary" href="/library">Open series roadmap</a>
					<a class="ghost-link" href="/updates">Follow build log</a>
				</div>
			{:else}
				<p class="eyebrow">Roadshow / locked lane</p>
				<h2>Roadshow Docu-Series</h2>
				<p>
					The documentary track sits beside the core curriculum, but it stays inside the paid member lane
					right now.
				</p>

				<div class="roadshow-grid roadshow-grid-locked">
					<div>
						<span>Status</span>
						<strong>Held for paid members</strong>
						<p>Free access keeps the shell open, but the documentary series remains staged behind membership.</p>
					</div>
					<div>
						<span>Relationship</span>
						<strong>Companion to the curriculum</strong>
						<p>The Roadshow lane is meant to add long-form field context around the same training release plan.</p>
					</div>
				</div>

				<div class="roadshow-actions">
					<a class="btn-primary" href="/checkout">Upgrade access</a>
					<a class="ghost-link" href="/library">See library roadmap</a>
				</div>
			{/if}
		</div>

		<div class="panel resource-panel">
			<div class="resource-panel-header">
				<div>
					<p class="eyebrow">External links</p>
					<h2>Resource stack</h2>
				</div>
				<span class="detail-pill muted">{data.links.length} visible</span>
			</div>

			{#if !primaryResource}
				<div class="list-card resource-empty">
					<strong>More resources unlock with member access.</strong>
					<p>
						Free access keeps the shell open, but the broader ShivWorks tool stack stays inside Bronze
						and VIP.
					</p>
				</div>
			{:else}
				<a
					class="resource-feature"
					href={primaryResource.url}
					target="_blank"
					rel="noreferrer"
				>
					<div class="resource-feature-top">
						<p class="card-eyebrow">{getResourceLane(primaryResource.linkKey)}</p>
						<SquareArrowOutUpRight size={16} />
					</div>
					<h3>{primaryResource.label}</h3>
					<p>{primaryResource.description}</p>
					<div class="resource-feature-meta">
						<span class="detail-pill muted">{getAudienceLabel(primaryResource.audience)}</span>
						<small>{primaryResource.ctaText || 'Open resource'}</small>
					</div>
				</a>

				<div class="resource-stack">
					{#each secondaryResources as link}
						<a class="resource-row" href={link.url} target="_blank" rel="noreferrer">
							<div class="resource-row-copy">
								<p class="card-eyebrow">{getResourceLane(link.linkKey)}</p>
								<strong>{link.label}</strong>
								<p>{link.description}</p>
							</div>
							<div class="resource-row-meta">
								<small>{link.ctaText || 'Open resource'}</small>
								<span>{getAudienceLabel(link.audience)}</span>
							</div>
						</a>
					{/each}
				</div>

				<div class="resource-summary">
					<div>
						<span>Primary route</span>
						<strong>{getResourceLane(primaryResource.linkKey)}</strong>
					</div>
					<div>
						<span>VIP path</span>
						<strong>{vipResourceVisible ? 'Visible now' : 'Locked to VIP'}</strong>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
