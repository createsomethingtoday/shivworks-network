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
	<title>Create account | {SITE_NAME}</title>
</svelte:head>

<section class="auth-shell">
	<div class="container auth-grid">
		<div class="auth-copy">
			<p class="eyebrow">Free access</p>
			<h1>Create your account and enter the network.</h1>
			<p>
				Email verification happens inside Clerk. Once your account is verified, your free-access
				dashboard is ready immediately, and you can upgrade to Bronze or VIP from inside the product.
			</p>
			{#if data.provisioned}
				<div class="status-message">
					<strong>Provisioned membership detected.</strong>
					Use
					{#if data.provisionedEmail}
						<strong>{data.provisionedEmail}</strong>
					{:else}
						the invited email
					{/if}
					when you create your password. Imported access will activate automatically after signup.
				</div>
			{/if}
		</div>

		<div class="auth-panel panel">
			<ClerkMount
				mode="signUp"
				publishableKey={data.publicConfig.clerkPublishableKey}
				fallbackRedirectUrl={data.redirectTo}
			/>
		</div>
	</div>
</section>
