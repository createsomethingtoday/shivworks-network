<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import CourseCard from '$lib/components/CourseCard.svelte';
	import { sortCoursesForDisplay } from '$lib/utils/course-order';
	import type { PageData } from './$types';

	type LibraryFilter = 'all' | 'available' | 'roadmap';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const isFree = $derived(data.user.tier === 'free');
	let activeFilter = $state<LibraryFilter>('all');
	const sortedCourses = $derived(sortCoursesForDisplay(data.courses));
	const availableCourses = $derived(sortedCourses.filter((course) => course.status === 'available'));
	const roadmapCourses = $derived(sortedCourses.filter((course) => course.status !== 'available'));
	const leadSeries = $derived(data.series[0] ?? null);
	const secondarySeries = $derived(data.series.slice(1));
	const filteredCourses = $derived(
		activeFilter === 'available'
			? availableCourses
			: activeFilter === 'roadmap'
				? roadmapCourses
				: sortedCourses
	);

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
				return 'Episodes are live inside the library’s series lane now.';
			case 'archived':
				return 'This series run has been retained as archive material inside the network.';
			default:
				return 'The series track is visible now and will move into active documentary episodes as ShivWorks releases it.';
		}
	}
</script>

<svelte:head>
	<title>Library | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container">
		<div class="section-heading">
			<p class="eyebrow">Curriculum shell</p>
			<h1>The complete ShivWorks roadmap, visible from day one.</h1>
			<p>
				{#if isFree}
					You are seeing the free-access slice of the roadmap. Upgrade to Bronze or VIP to reveal the
					full curriculum as it is structured inside the network.
				{:else}
					Every course in the planned curriculum is listed here now. Courses move from coming soon to
					available as production releases land.
				{/if}
			</p>
		</div>

			{#if isFree}
				<div class="status-message upgrade-banner">
					<strong>Free library access.</strong>
				<span>
					Selected roadmap items stay visible here, but the broader curriculum map is reserved for paid members.
				</span>
					<a class="ghost-link" href="/checkout">Upgrade access</a>
				</div>
			{/if}

			{#if data.resumeItem}
				<a class="panel resume-panel" href={`/library/${data.resumeItem.courseSlug}?module=${data.resumeItem.moduleId}`}>
					<p class="eyebrow">Resume training</p>
					<h2>{data.resumeItem.courseTitle}</h2>
					<p>
						Continue with {data.resumeItem.moduleTitle}.
						{#if data.resumeItem.completedAt}
							Completed on this account.
						{:else if data.resumeItem.durationSeconds}
							{Math.round((data.resumeItem.currentSeconds / data.resumeItem.durationSeconds) * 100)}%
							watched.
						{:else}
							Resume from {Math.floor(data.resumeItem.currentSeconds / 60)
								.toString()
								.padStart(2, '0')}:{(data.resumeItem.currentSeconds % 60).toString().padStart(2, '0')}.
						{/if}
					</p>
					<span class="ghost-link">Open module</span>
				</a>
			{/if}

			<div class="library-toolbar">
				<div class="library-summary">
					<span class="detail-pill">{sortedCourses.length} visible now</span>
					<span class:muted={availableCourses.length === 0} class="detail-pill">
						{availableCourses.length} ready now
					</span>
					<span class="detail-pill muted">{roadmapCourses.length} roadmap blocks</span>
				</div>

				<div class="filter-group" aria-label="Library filters">
					<button
						type="button"
						class:active={activeFilter === 'all'}
						class="filter-chip"
						aria-pressed={activeFilter === 'all'}
						onclick={() => (activeFilter = 'all')}
					>
						All visible
					</button>
					<button
						type="button"
						class:active={activeFilter === 'available'}
						class="filter-chip"
						aria-pressed={activeFilter === 'available'}
						onclick={() => (activeFilter = 'available')}
					>
						Ready now
					</button>
					<button
						type="button"
						class:active={activeFilter === 'roadmap'}
						class="filter-chip"
						aria-pressed={activeFilter === 'roadmap'}
						onclick={() => (activeFilter = 'roadmap')}
					>
						Roadmap
					</button>
				</div>
			</div>

			<p class="library-status-copy">
				{#if activeFilter === 'available'}
					Showing the curriculum blocks that are live and watchable right now.
				{:else if activeFilter === 'roadmap'}
					Showing the visible roadmap blocks that have not fully opened yet.
				{:else}
					Showing the full visible curriculum, with watchable blocks surfaced first.
				{/if}
			</p>

			<div class="card-grid three-up">
				{#if data.courses.length === 0}
				<article class="panel">
					<p class="card-eyebrow">No free courses live yet</p>
					<h2>Upgrade to unlock the full roadmap.</h2>
					<p>The free lane is ready, but ShivWorks has not marked any curriculum blocks as free access yet.</p>
					<a class="ghost-link" href="/checkout">View member access</a>
				</article>
				{:else}
					{#if filteredCourses.length === 0}
						<article class="panel">
							<p class="card-eyebrow">
								{activeFilter === 'available' ? 'Nothing live yet' : 'Roadmap cleared'}
							</p>
							<h2>
								{activeFilter === 'available'
									? 'No watchable courses match this filter yet.'
									: 'Everything visible right now is already live.'}
							</h2>
							<p>
								{activeFilter === 'available'
									? 'Keep the roadmap view open to track what is landing next, or return after the next release.'
									: 'Switch back to the full library view to jump into the currently available blocks.'}
							</p>
						</article>
					{:else}
						{#each filteredCourses as course}
						<CourseCard {course} href={`/library/${course.slug}`} />
						{/each}
					{/if}
				{/if}
			</div>
		</div>
</section>

<section class="section-block">
	<div class="container">
		<div class="section-heading compact">
			<p class="eyebrow">Series lane</p>
			<h2>Long-form documentary tracks beside the curriculum.</h2>
			<a href="/updates" class="ghost-link">
				Track in build log
				<ArrowRight size={16} />
			</a>
		</div>

		{#if !leadSeries}
			<article class="panel roadshow-panel">
				<p class="eyebrow">Series / locked lane</p>
				<h2>Series access opens with membership.</h2>
				<p>
					The documentary and long-form series track is held behind the member lane right now, but the
					library is already structured to stage it beside the core curriculum.
				</p>

				<div class="roadshow-grid roadshow-grid-locked">
					<div>
						<span>Status</span>
						<strong>Held for paid members</strong>
						<p>Free access keeps the shell open, but the series lane stays behind Bronze and VIP.</p>
					</div>
					<div>
						<span>Relationship</span>
						<strong>{sortedCourses.length} visible curriculum block{sortedCourses.length === 1 ? '' : 's'}</strong>
						<p>The documentary track is meant to add field context around the same training roadmap.</p>
					</div>
				</div>

				<div class="roadshow-actions">
					<a class="btn-primary" href="/checkout">Upgrade access</a>
					<a class="ghost-link" href="/updates">Follow release notes</a>
				</div>
			</article>
		{:else}
			<div class="library-series-layout">
				<article class="panel roadshow-panel">
					<div class="roadshow-header">
						<div>
							<p class="eyebrow">Series / documentary track</p>
							<h2>{leadSeries.title}</h2>
						</div>
						<span class="detail-pill muted">{getAudienceLabel(leadSeries.accessTier)}</span>
					</div>
					<p>{leadSeries.description}</p>

					<div class="updates-meta-row">
						<span class="detail-pill">{getSeriesStatusLabel(leadSeries.status)}</span>
						<span class="detail-pill muted">Visible in library now</span>
						<span class="detail-pill muted">Companion to the core curriculum</span>
					</div>

					<div class="roadshow-grid">
						<div>
							<span>Status</span>
							<strong>{getSeriesStatusLabel(leadSeries.status)}</strong>
							<p>{getSeriesStatusCopy(leadSeries.status)}</p>
						</div>
						<div>
							<span>Training relationship</span>
							<strong>{availableCourses.length} ready course{availableCourses.length === 1 ? '' : 's'}</strong>
							<p>
								The series lane runs beside the same curriculum map that already has
								{#if roadmapCourses.length > 0}
									{` ${roadmapCourses.length} roadmap block${roadmapCourses.length === 1 ? '' : 's'} queued.`}
								{:else}
									its live training lane open now.
								{/if}
							</p>
						</div>
						<div>
							<span>Next move</span>
							<strong>Track releases here</strong>
							<p>
								As ShivWorks promotes documentary episodes into the live lane, they can surface here
								without changing the member workflow or leaving the library.
							</p>
						</div>
					</div>

					<div class="roadshow-actions">
						<a class="btn-secondary" href="/updates">Open build log</a>
						<a class="ghost-link" href="/dashboard">Return to dashboard</a>
					</div>
				</article>

				<div class="series-side">
					<article class="panel series-side-card">
						<p class="eyebrow">Lane summary</p>
						<div class="series-summary-grid">
							<div>
								<span>Visible series</span>
								<strong>{data.series.length}</strong>
							</div>
							<div>
								<span>Documentary state</span>
								<strong>{leadSeries.status === 'available' ? 'Live' : 'Staged'}</strong>
							</div>
						</div>
						<p>
							This section is designed as a parallel track to the skill curriculum, not a detached media
							shelf.
						</p>
					</article>

					{#if secondarySeries.length > 0}
						<article class="panel series-side-card">
							<p class="eyebrow">Additional tracks</p>
							<div class="series-stack">
								{#each secondarySeries as item}
									<div class="series-row">
										<div>
											<p class="card-eyebrow">{getSeriesStatusLabel(item.status)}</p>
											<strong>{item.title}</strong>
											<p>{item.description}</p>
										</div>
										<span class="detail-pill muted">{getAudienceLabel(item.accessTier)}</span>
									</div>
								{/each}
							</div>
						</article>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>
