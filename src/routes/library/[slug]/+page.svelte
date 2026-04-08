<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ArrowLeft, ArrowRight, Clock3, Lock, PlayCircle } from 'lucide-svelte';
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type ModuleProgress = {
		moduleId: string;
		currentSeconds: number;
		durationSeconds: number | null;
		completedAt: number | null;
		updatedAt: number;
	};

	let { data }: Props = $props();

	function getInitialProgressByModule() {
		return data.progressByModule;
	}

	let progressByModule = $state<Record<string, ModuleProgress>>(getInitialProgressByModule());
	let playerElement = $state<HTMLVideoElement | null>(null);
	let saveFeedback = $state<string | null>(null);
	let lastSavedSeconds = 0;
	let restoredModuleId: string | null = null;
	let activeModuleId: string | null = null;
	let saveErrorResetTimer: ReturnType<typeof setTimeout> | null = null;

	const selectedModule = $derived(
		data.modules.find((module) => module.id === data.selectedModuleId) || data.modules[0] || null
	);
	const selectedModuleVideoUrl = $derived(selectedModule?.videoUrl || undefined);
	const selectedModuleCaptionUrl = $derived(
		selectedModule?.id === 'module_core_platform_brief'
			? '/captions/shivworks-member-brief.vtt'
			: '/captions/shivworks-free-preview.vtt'
	);
	const selectedModuleIndex = $derived(
		selectedModule ? data.modules.findIndex((module) => module.id === selectedModule.id) + 1 : 0
	);
	const canPlaySelected = $derived(
		Boolean(selectedModule && selectedModule.status === 'available' && selectedModule.videoUrl)
	);
	const availableModuleCount = $derived(
		data.modules.filter((module) => module.status === 'available').length
	);
	const roadmapModuleCount = $derived(
		data.modules.filter((module) => module.status !== 'available').length
	);
	const completedModuleCount = $derived(
		data.modules.filter((module) => Boolean(progressByModule[module.id]?.completedAt)).length
	);
	const nextPlayableModule = $derived.by(() => {
		if (!selectedModule) {
			return null;
		}

		const selectedIndex = data.modules.findIndex((module) => module.id === selectedModule.id);
		if (selectedIndex === -1) {
			return null;
		}

		return (
			data.modules
				.slice(selectedIndex + 1)
				.find((module) => module.status === 'available' && module.videoUrl) || null
		);
	});

	const selectedProgress = $derived(
		selectedModule ? progressByModule[selectedModule.id] || null : null
	);
	const selectedProgressPercent = $derived(
		selectedProgress ? getProgressPercent(selectedProgress) : 0
	);

	function getProgressPercent(progress: ModuleProgress | null | undefined): number {
		if (!progress) {
			return 0;
		}

		if (progress.completedAt) {
			return 100;
		}

		if (!progress.durationSeconds || progress.durationSeconds <= 0) {
			return 0;
		}

		return Math.max(
			0,
			Math.min(100, Math.round((progress.currentSeconds / progress.durationSeconds) * 100))
		);
	}

	function formatResumeLabel(seconds: number): string {
		const totalSeconds = Math.max(0, Math.floor(seconds));
		const minutes = Math.floor(totalSeconds / 60)
			.toString()
			.padStart(2, '0');
		const remainingSeconds = (totalSeconds % 60).toString().padStart(2, '0');
		return `${minutes}:${remainingSeconds}`;
	}

	function updateLocalProgress(
		currentSeconds: number,
		durationSeconds: number | null,
		completed = false
	) {
		if (!selectedModule) {
			return;
		}

		progressByModule = {
			...progressByModule,
			[selectedModule.id]: {
				moduleId: selectedModule.id,
				currentSeconds: Math.max(0, Math.round(currentSeconds)),
				durationSeconds:
					durationSeconds === null ? null : Math.max(0, Math.round(durationSeconds)),
				completedAt: completed ? Date.now() : null,
				updatedAt: Date.now()
			}
		};
	}

	function clearSaveFeedbackSoon() {
		if (saveErrorResetTimer) {
			clearTimeout(saveErrorResetTimer);
		}

		saveErrorResetTimer = setTimeout(() => {
			saveFeedback = null;
		}, 2200);
	}

	async function persistProgress(force = false, completed = false) {
		if (!playerElement || !selectedModule || selectedModule.videoKind !== 'mp4') {
			return;
		}

		const currentSeconds = Math.max(0, Math.round(playerElement.currentTime || 0));
		const durationSeconds =
			playerElement.duration && Number.isFinite(playerElement.duration)
				? Math.round(playerElement.duration)
				: selectedProgress?.durationSeconds || null;

		if (!force && Math.abs(currentSeconds - lastSavedSeconds) < 10) {
			return;
		}

		lastSavedSeconds = currentSeconds;
		updateLocalProgress(currentSeconds, durationSeconds, completed);

		try {
			const response = await fetch(`/api/library/modules/${selectedModule.id}/progress`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentSeconds,
					durationSeconds,
					completed
				})
			});

			if (!response.ok) {
				const result = await response
					.json()
					.catch(() => ({ error: 'Unable to save progress.' }));
				saveFeedback = result.error || 'Unable to save progress.';
				clearSaveFeedbackSoon();
			}
		} catch {
			saveFeedback = 'Unable to save progress.';
			clearSaveFeedbackSoon();
		}
	}

	function restorePlaybackPosition() {
		if (!playerElement || !selectedModule || selectedModule.videoKind !== 'mp4') {
			return;
		}

		const progress = progressByModule[selectedModule.id];
		if (!progress || progress.completedAt || restoredModuleId === selectedModule.id) {
			return;
		}

		if (progress.currentSeconds <= 3) {
			lastSavedSeconds = progress.currentSeconds;
			restoredModuleId = selectedModule.id;
			return;
		}

		const safeResumePoint =
			playerElement.duration && progress.currentSeconds >= playerElement.duration - 4
				? Math.max(0, Math.round(playerElement.duration) - 6)
				: progress.currentSeconds;

		playerElement.currentTime = safeResumePoint;
		lastSavedSeconds = safeResumePoint;
		restoredModuleId = selectedModule.id;
	}

	function handleLoadedMetadata() {
		restorePlaybackPosition();
	}

	function handleTimeUpdate() {
		if (!playerElement || !selectedModule) {
			return;
		}

		const durationSeconds =
			playerElement.duration && Number.isFinite(playerElement.duration)
				? Math.round(playerElement.duration)
				: selectedProgress?.durationSeconds || null;
		updateLocalProgress(playerElement.currentTime, durationSeconds, false);
		void persistProgress(false, false);
	}

	function handlePause() {
		void persistProgress(true, false);
	}

	function handleEnded() {
		if (!playerElement) {
			return;
		}

		const durationSeconds =
			playerElement.duration && Number.isFinite(playerElement.duration)
				? Math.round(playerElement.duration)
				: selectedProgress?.durationSeconds || null;
		updateLocalProgress(durationSeconds || playerElement.currentTime, durationSeconds, true);
		void persistProgress(true, true);
	}

	$effect(() => {
		const moduleId = selectedModule?.id || null;
		if (!moduleId || moduleId === activeModuleId) {
			return;
		}

		activeModuleId = moduleId;
		restoredModuleId = null;
		lastSavedSeconds = progressByModule[moduleId]?.currentSeconds || 0;
		saveFeedback = null;
	});

	onDestroy(() => {
		if (saveErrorResetTimer) {
			clearTimeout(saveErrorResetTimer);
		}

		void persistProgress(true, false);
	});
</script>

<svelte:head>
	<title>{data.course.title} | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container stack-column">
		<a class="ghost-link" href="/library">
			<ArrowLeft size={16} />
			Back to library
		</a>

		<div class="course-detail-grid">
			<div class="panel course-detail-copy">
				<p class="eyebrow">{getAudienceLabel(data.course.accessTier)}</p>
				<h1>{data.course.title}</h1>
				<p class="course-detail-lede">{data.course.description}</p>

				<div class="inline-membership">
					<span class="detail-pill">
						{data.course.badgeText ||
							(data.course.status === 'available' ? 'Watch now' : 'Coming soon')}
					</span>
					<span class="detail-pill muted">
						{data.modules.length} module{data.modules.length === 1 ? '' : 's'}
					</span>
				</div>

				<div class="course-stat-grid">
					<div class="course-stat">
						<span>Ready now</span>
						<strong>{availableModuleCount}</strong>
					</div>
					<div class="course-stat">
						<span>On roadmap</span>
						<strong>{roadmapModuleCount}</strong>
					</div>
					<div class="course-stat">
						<span>Completed here</span>
						<strong>{completedModuleCount}</strong>
					</div>
				</div>

				{#if selectedModule}
					<div class="module-brief">
						<p class="card-eyebrow">Current module</p>
						<h2>{selectedModule.title}</h2>
						<p>
							{selectedModule.description ||
								'This module outline is live in the curriculum shell.'}
						</p>
						<div class="event-meta">
							<span><Clock3 size={16} /> {selectedModule.durationLabel || 'Timing not set'}</span>
							<span>
								{selectedModule.status === 'available' ? 'Available now' : 'Coming soon'}
							</span>
						</div>
						{#if selectedProgress}
							<div class="watch-progress-block">
								<div class="watch-progress-header">
									<span class="card-eyebrow">Playback progress</span>
									<strong>
										{selectedProgress.completedAt
											? 'Completed'
											: `${selectedProgressPercent}% complete`}
									</strong>
								</div>
								<div class="watch-progress-bar" aria-hidden="true">
									<div
										class="watch-progress-fill"
										style={`width: ${selectedProgressPercent}%`}
									></div>
								</div>
								<p class="watch-progress-copy">
									{#if selectedProgress.completedAt}
										This module has been completed on this account.
									{:else if selectedProgress.currentSeconds > 0}
										Resume from {formatResumeLabel(selectedProgress.currentSeconds)}.
									{:else}
										No playback progress has been saved yet.
									{/if}
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="panel course-player-panel">
				{#if selectedModule}
					<div class="course-player-header">
						<p class="eyebrow">Playback</p>
						<h2>{selectedModule.title}</h2>
						<p>
							{#if canPlaySelected}
								This module is live now inside the ShivWorks training lane.
							{:else}
								This module remains visible in the queue so members can track the release order.
							{/if}
						</p>
						<div class="course-player-meta">
							<span class="detail-pill muted">Module {selectedModuleIndex}</span>
							{#if selectedModule.durationLabel}
								<span class="detail-pill muted">
									<Clock3 size={14} />
									{selectedModule.durationLabel}
								</span>
							{/if}
							<span class="detail-pill">
								{selectedModule.status === 'available' ? 'Available now' : 'Coming soon'}
							</span>
						</div>
					</div>

					{#if canPlaySelected}
						{#if selectedModule.videoKind === 'mp4'}
							<video
								class="course-video"
								src={selectedModuleVideoUrl}
								bind:this={playerElement}
								controls
								playsinline
								preload="metadata"
								onloadedmetadata={handleLoadedMetadata}
								ontimeupdate={handleTimeUpdate}
								onpause={handlePause}
								onended={handleEnded}
							>
								<track
									kind="captions"
									src={selectedModuleCaptionUrl}
									srclang="en"
									label="English captions"
									default
								/>
								<p>Your browser does not support embedded video playback.</p>
							</video>
						{:else if selectedModule.videoKind === 'embed'}
							<div class="embed-shell course-embed-shell">
								<iframe
									title={`Playback for ${selectedModule.title}`}
									src={selectedModuleVideoUrl}
									loading="lazy"
									allow="autoplay; fullscreen; picture-in-picture"
								></iframe>
							</div>
						{/if}
					{:else}
						<div class="course-player-placeholder">
							<Lock size={20} />
							<strong>This module is not live yet.</strong>
							<p>Playback will unlock here as soon as ShivWorks marks the module available.</p>
						</div>
					{/if}
				{:else}
					<div class="course-player-placeholder">
						<Lock size={20} />
						<strong>No modules are configured yet.</strong>
						<p>Use the admin panel to add module playback details when the first release is ready.</p>
					</div>
				{/if}

				{#if selectedModule}
					<div class="course-player-footer">
						<p class="course-player-note">
							{#if selectedProgress?.completedAt}
								This module is completed. Use the queue below to reopen it or move into the next live block.
							{:else if selectedProgress && selectedProgress.currentSeconds > 0}
								Your progress is saved automatically while you watch on this account.
							{:else if canPlaySelected}
								Start here, then move through the queue as ShivWorks opens the next modules.
							{:else}
								The release queue stays visible so the curriculum never feels hidden behind launch timing.
							{/if}
						</p>
						{#if nextPlayableModule}
							<a class="ghost-link" href={`/library/${data.course.slug}?module=${nextPlayableModule.id}`}>
								Next live module
								<ArrowRight size={16} />
							</a>
						{/if}
					</div>
				{/if}

				{#if saveFeedback}
					<div class="status-message error compact-status">{saveFeedback}</div>
				{/if}
			</div>
		</div>

		<div class="panel">
			<div class="section-heading compact">
				<p class="eyebrow">Modules</p>
				<h2>Playback queue</h2>
				<p>
					{availableModuleCount} module{availableModuleCount === 1 ? '' : 's'} ready now,
					{roadmapModuleCount} still on the roadmap.
				</p>
			</div>

			<div class="module-stack">
				{#each data.modules as module}
					<a
						class:selected={module.id === data.selectedModuleId}
						class:available={module.status === 'available'}
						class="module-row"
						href={`/library/${data.course.slug}?module=${module.id}`}
					>
						<div>
							<p class="card-eyebrow">Module {module.sortOrder}</p>
							<strong>{module.title}</strong>
							<p>{module.description || 'Module summary coming soon.'}</p>
						</div>
						<div class="module-row-meta">
							{#if progressByModule[module.id]}
								<span>
									{progressByModule[module.id].completedAt
										? 'Completed'
										: `${getProgressPercent(progressByModule[module.id])}% watched`}
								</span>
							{/if}
							{#if module.durationLabel}
								<span><Clock3 size={14} /> {module.durationLabel}</span>
							{/if}
							<span>{module.status === 'available' ? 'Available' : 'Coming soon'}</span>
							{#if module.videoUrl && module.status === 'available'}
								<span><PlayCircle size={14} /> Play</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
</section>
