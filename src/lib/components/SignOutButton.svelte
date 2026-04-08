<script lang="ts">
	import { LogOut } from 'lucide-svelte';
	import { loadBrowserClerk } from '$lib/client/clerk';

	interface Props {
		publishableKey?: string | null;
	}

	let { publishableKey = null }: Props = $props();
	let isLoading = $state(false);

	async function handleSignOut() {
		isLoading = true;
		try {
			const clerk = await loadBrowserClerk(publishableKey);
			await clerk.signOut({ redirectUrl: '/login' });
		} finally {
			isLoading = false;
		}
	}
</script>

<button class="ghost-link" disabled={isLoading} onclick={handleSignOut}>
	<LogOut size={16} />
	{isLoading ? 'Signing out…' : 'Sign out'}
</button>
