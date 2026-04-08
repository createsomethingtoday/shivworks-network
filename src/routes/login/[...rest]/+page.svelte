<script lang="ts">
	import ClerkMount from '$lib/components/ClerkMount.svelte';
	import { SITE_NAME } from '$lib/constants/site';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Sign in | {SITE_NAME}</title>
</svelte:head>

<section class="auth-shell">
	<div class="container auth-grid">
		<div class="auth-copy">
			<p class="eyebrow">Member access</p>
			<h1>Sign in to the ShivWorks Network.</h1>
			<p>
				Use the email connected to your account. Free-access accounts land in the preview lane after
				sign-in, while paid members unlock the full curriculum, live sessions, and community routes.
			</p>
		</div>

		<div class="auth-panel panel">
			<ClerkMount
				mode="signIn"
				publishableKey={data.publicConfig.clerkPublishableKey}
				fallbackRedirectUrl={data.redirectTo}
			/>
		</div>
	</div>
</section>
