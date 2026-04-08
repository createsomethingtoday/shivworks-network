<script lang="ts">
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
</script>

<div class="page-frame">
	<Nav user={data.user} clerkPublishableKey={data.publicConfig.clerkPublishableKey} />
	<main class="page-main">
		{@render children()}
	</main>
	<Footer />
</div>
