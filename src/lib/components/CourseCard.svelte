<script lang="ts">
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { CourseRecord } from '$lib/server/db/shivworks';

	interface Props {
		course: CourseRecord;
		href?: string;
	}

	let { course, href }: Props = $props();
	const statusLabel = $derived(
		course.badgeText || (course.status === 'available' ? 'Now available' : 'Coming soon')
	);
	const actionLabel = $derived(
		course.status === 'available'
			? course.completedModuleCount > 0 &&
				course.availableModuleCount > 0 &&
				course.completedModuleCount >= course.availableModuleCount
				? 'Review course'
				: course.startedModuleCount > 0
					? 'Resume course'
					: 'Open course'
			: course.status === 'archived'
				? 'Review archive'
				: 'View roadmap'
	);
	const courseCode = $derived(
		course.title
			.split(/\s+/)
			.map((part) => part[0] || '')
			.join('')
			.slice(0, 4)
			.toUpperCase()
	);
	const courseType = $derived(course.courseKind === 'series' ? 'Series lane' : 'Curriculum block');
	const accessLabel = $derived(getAudienceLabel(course.accessTier));
	const moduleSummary = $derived.by(() => {
		if (course.totalModuleCount === 0) {
			return 'No modules configured yet';
		}

		if (course.availableModuleCount === 0) {
			return `${course.totalModuleCount} roadmap module${course.totalModuleCount === 1 ? '' : 's'}`;
		}

		if (course.roadmapModuleCount > 0) {
			return `${course.availableModuleCount} live · ${course.roadmapModuleCount} roadmap`;
		}

		return `${course.availableModuleCount} live module${course.availableModuleCount === 1 ? '' : 's'}`;
	});
	const memberState = $derived.by(() => {
		if (
			course.completedModuleCount > 0 &&
			course.availableModuleCount > 0 &&
			course.completedModuleCount >= course.availableModuleCount
		) {
			return 'Completed';
		}

		if (course.startedModuleCount > 0) {
			return 'In progress';
		}

		if (course.availableModuleCount > 0) {
			return 'Ready now';
		}

		return 'Roadmap';
	});
	const progressSummary = $derived.by(() => {
		if (
			course.completedModuleCount > 0 &&
			course.availableModuleCount > 0 &&
			course.completedModuleCount >= course.availableModuleCount
		) {
			return `Completed ${course.completedModuleCount}/${course.availableModuleCount} live`;
		}

		if (course.startedModuleCount > 0) {
			return `${course.startedModuleCount} started · ${course.completedModuleCount} completed`;
		}

		if (course.availableModuleCount > 0) {
			return `${course.availableModuleCount} watchable now`;
		}

		return 'Tracking release order';
	});
</script>

<article class:available={course.status === 'available'} class="course-card">
	<div class="course-art">
		<div class="course-art-top">
			<span class="course-label">{courseType}</span>
			<span class:available={course.status === 'available'} class="course-status">{statusLabel}</span>
		</div>
		<div class="course-mark">
			<strong>{courseCode}</strong>
			<p>{course.title}</p>
		</div>
	</div>
	<div class="course-copy">
		<div class="course-copy-top">
			<p class="card-eyebrow">{course.courseKind === 'series' ? 'Series' : 'Course'}</p>
			<span class:vip={course.accessTier === 'vip'} class:free={course.accessTier === 'free'} class="course-access">
				{accessLabel}
			</span>
		</div>
		<h3>{course.title}</h3>
		<p>{course.description}</p>
		<div class="course-insights">
			<div class="course-insight-row">
				<span class="course-insight-label">{moduleSummary}</span>
				<span
					class:complete={memberState === 'Completed'}
					class:progress={memberState === 'In progress'}
					class:roadmap={memberState === 'Roadmap'}
					class="course-member-state"
				>
					{memberState}
				</span>
			</div>
			<p class="course-progress-copy">{progressSummary}</p>
		</div>
		{#if href}
			<a class="course-cta" href={href}>
				{actionLabel}
			</a>
		{/if}
	</div>
</article>

<style>
	.course-card {
		display: flex;
		flex-direction: column;
		border-radius: 1.5rem;
		overflow: hidden;
		background: var(--surface-elevated);
		border: 1px solid rgba(209, 178, 122, 0.16);
		min-height: 100%;
		transition:
			transform 140ms ease,
			border-color 140ms ease,
			box-shadow 140ms ease;
	}

	.course-card:hover {
		transform: translateY(-2px);
		border-color: var(--color-border-strong);
		box-shadow: var(--shadow-accent);
	}

	.course-card.available {
		border-color: rgba(209, 178, 122, 0.28);
		box-shadow:
			0 0 0 1px rgba(209, 178, 122, 0.08),
			0 24px 60px rgba(0, 0, 0, 0.26);
	}

	.course-art {
		min-height: 12.5rem;
		padding: 1rem 1rem 1.2rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		background:
			radial-gradient(circle at top right, rgba(209, 178, 122, 0.2), transparent 34%),
			linear-gradient(135deg, rgba(155, 103, 60, 0.22), rgba(11, 11, 11, 0.95) 55%),
			repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 12px);
		border-bottom: 1px solid rgba(209, 178, 122, 0.12);
	}

	.course-art-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.course-label,
	.course-status {
		padding: 0.36rem 0.7rem;
		border-radius: 999px;
		background: rgba(10, 10, 10, 0.76);
		border: 1px solid rgba(209, 178, 122, 0.14);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-fg-secondary);
	}

	.course-status.available {
		color: #f4ede1;
		border-color: rgba(209, 178, 122, 0.3);
		background: rgba(209, 178, 122, 0.12);
	}

	.course-mark strong {
		display: block;
		font-family: var(--font-display);
		font-size: clamp(2.3rem, 5vw, 3.4rem);
		line-height: 0.92;
		letter-spacing: -0.06em;
		color: #f8f2e8;
	}

	.course-mark p {
		margin: 0.35rem 0 0;
		color: rgba(244, 237, 225, 0.72);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.course-copy {
		padding: 1.2rem;
	}

	.course-copy-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.45rem;
	}

	.course-copy-top :global(.card-eyebrow) {
		margin-bottom: 0;
	}

	.course-access {
		display: inline-flex;
		align-items: center;
		padding: 0.28rem 0.58rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.64rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.course-access.free {
		border-color: rgba(255, 255, 255, 0.16);
	}

	.course-access.vip {
		color: #e9bf93;
		border-color: rgba(155, 103, 60, 0.36);
		background: rgba(155, 103, 60, 0.12);
	}

	h3 {
		margin: 0 0 0.55rem;
		font-size: 1.14rem;
	}

	.course-copy p {
		margin: 0;
		color: var(--color-fg-muted);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.course-cta {
		display: inline-flex;
		align-items: center;
		margin-top: 1rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.course-insights {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.course-insight-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.course-insight-label {
		color: var(--color-fg-secondary);
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.course-member-state {
		display: inline-flex;
		align-items: center;
		padding: 0.26rem 0.54rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-fg-primary);
		font-family: var(--font-mono);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.course-member-state.progress {
		border-color: rgba(209, 178, 122, 0.24);
		background: rgba(209, 178, 122, 0.1);
		color: var(--color-accent);
	}

	.course-member-state.complete {
		border-color: rgba(155, 103, 60, 0.28);
		background: rgba(155, 103, 60, 0.12);
		color: #e9bf93;
	}

	.course-member-state.roadmap {
		color: var(--color-fg-secondary);
	}

	.course-progress-copy {
		margin-top: 0.55rem !important;
		color: var(--color-fg-secondary);
		font-size: 0.88rem;
	}
</style>
