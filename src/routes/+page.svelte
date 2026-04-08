<script lang="ts">
	import { ArrowRight, Shield, Video, Users, Radio } from 'lucide-svelte';
	import { SHIVWORKS_MAIN_SITE, SHIVWORKS_MEMBERSHIP_URL, SITE_NAME } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
</svelte:head>

<section class="hero-shell">
	<div class="container hero-grid">
		<div class="hero-copy">
			<div class="hero-kicker-row">
				<p class="eyebrow">Private member platform</p>
				<span class="hero-pill">Purpose-built for ShivWorks</span>
			</div>
			<h1>A sharper home for the ShivWorks Network.</h1>
			<p class="lede">
				The public brand stays outside. The member experience lives here, with curriculum access,
				live sessions, update briefings, and private community entry inside one disciplined product
				shell.
			</p>

			<div class="hero-actions">
				{#if data.user?.accessStatus === 'active'}
					<a class="btn-primary" href="/dashboard">
						Go to dashboard
						<ArrowRight size={16} />
					</a>
				{:else}
					<a class="btn-primary" href="/login">
						Sign in
						<ArrowRight size={16} />
					</a>
					<a class="btn-secondary" href="/signup">Create free account</a>
				{/if}
				<a class="ghost-link" href={SHIVWORKS_MEMBERSHIP_URL} target="_blank" rel="noreferrer">
					Back to membership page
				</a>
			</div>

			<div class="hero-pills">
				<span class="hero-pill">Curriculum roadmap</span>
				<span class="hero-pill">Live member sessions</span>
				<span class="hero-pill">Private community</span>
			</div>
		</div>

		<div class="hero-panel panel ops-board">
			<p class="card-eyebrow">Inside the network</p>
			<div class="ops-grid">
				<div class="ops-cell">
					<span class="ops-value">Track 01</span>
					<strong>Secured access</strong>
					<p>Member identity, gated entry, and account recovery live inside the product itself.</p>
				</div>
				<div class="ops-cell">
					<span class="ops-value">Track 02</span>
					<strong>Curriculum roadmap</strong>
					<p>Members can see the full training roadmap before each course drops into the library.</p>
				</div>
				<div class="ops-cell">
					<span class="ops-value">Track 03</span>
					<strong>Live training touchpoints</strong>
					<p>Livestreams, reminders, and VIP call handling all route through the same member shell.</p>
				</div>
				<div class="ops-cell">
					<span class="ops-value">Track 04</span>
					<strong>Private discussion space</strong>
					<p>Community access is framed as part of the network, not a side chat detached from the product.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="section-block section-simple">
	<div class="container">
		<div class="section-heading">
			<p class="eyebrow">What changes here</p>
			<h2>Built to feel like an internal training network, not a generic portal.</h2>
			<p>
				The visual system takes cues from ShivWorks.com, then tightens them into a darker, cleaner,
				more product-focused shell for repeat member use.
			</p>
		</div>

		<div class="card-grid three-up promise-grid">
			<article class="panel promise-card">
				<div class="promise-icon">
					<Shield size={18} />
				</div>
				<h3>Controlled member access</h3>
				<p>Authentication, tier gating, and account state live in one place from the first sign-in.</p>
			</article>

			<article class="panel promise-card">
				<div class="promise-icon">
					<Video size={18} />
				</div>
				<h3>Curriculum-first structure</h3>
				<p>The library is framed around the release plan so members can track what is live and what is next.</p>
			</article>

			<article class="panel promise-card">
				<div class="promise-icon">
					<Radio size={18} />
				</div>
				<h3>Operational updates</h3>
				<p>Live sessions, shipping updates, and community access read like an ongoing briefing, not scattered announcements.</p>
			</article>
		</div>
	</div>
</section>

<section class="section-block">
	<div class="container">
		<div class="panel mission-note">
			<div class="section-rule"></div>
			<p class="eyebrow">Where to go</p>
			<h2>Public brand outside. Member operations inside.</h2>
			<p>
				ShivWorks.com remains the public-facing site for course information and broader brand context.
				This app is the member environment for sign-in, curriculum access, live session routing, and
				private discussion.
			</p>
			<p>
				If you landed here from
				<a href={SHIVWORKS_MAIN_SITE} target="_blank" rel="noreferrer">shivworks.com</a>, use the
				same email connected to your membership and finish setup here.
			</p>
		</div>
	</div>
</section>
