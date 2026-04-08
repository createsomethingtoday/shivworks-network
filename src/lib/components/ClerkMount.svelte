<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { loadBrowserClerk } from '$lib/client/clerk';
	import { SUPPORT_EMAIL } from '$lib/constants/site';

	interface Props {
		mode: 'signIn' | 'signUp' | 'userProfile';
		publishableKey?: string | null;
		fallbackRedirectUrl?: string;
		forceRedirectUrl?: string;
	}

	let {
		mode,
		publishableKey = null,
		fallbackRedirectUrl = '/dashboard',
		forceRedirectUrl
	}: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	const missingConfigurationMessage =
		'Authentication is not configured for this environment yet. Add the Clerk public key to the ShivWorks Pages environment and refresh.';

	function getInitialMountError() {
		return publishableKey ? null : missingConfigurationMessage;
	}

	let mountError = $state<string | null>(getInitialMountError());
	const sharedVariables = {
		colorPrimary: '#d1b27a',
		colorPrimaryForeground: '#090909',
		colorBackground: '#100d09',
		colorNeutral: 'rgba(255, 255, 255, 0.12)',
		colorForeground: '#f4ede1',
		colorMuted: 'rgba(255, 255, 255, 0.04)',
		colorMutedForeground: '#c6b79c',
		colorInput: '#0a0a0a',
		colorInputForeground: '#f4ede1',
		colorBorder: 'rgba(209, 178, 122, 0.18)',
		colorRing: 'rgba(209, 178, 122, 0.32)',
		fontFamily: 'Space Grotesk, sans-serif',
		fontFamilyButtons: 'Space Grotesk, sans-serif',
		borderRadius: '18px'
	} as const;

	const sharedElements = {
		rootBox: {
			width: '100%'
		},
		card: {
			background: 'linear-gradient(180deg, rgba(18, 14, 10, 0.98), rgba(12, 9, 7, 0.98))',
			border: '1px solid rgba(209, 178, 122, 0.14)',
			boxShadow: '0 24px 56px rgba(0, 0, 0, 0.42)'
		},
		headerTitle: {
			color: '#f4ede1'
		},
		headerSubtitle: {
			color: '#c6b79c'
		},
		formFieldInput: {
			background: '#0a0a0a',
			color: '#f4ede1',
			border: '1px solid rgba(209, 178, 122, 0.12)'
		},
		formFieldLabel: {
			color: '#d8ccb5'
		},
		dividerText: {
			color: '#b7a88e'
		},
		footerActionText: {
			color: '#b7a88e'
		},
		footerActionLink: {
			color: '#f4ede1'
		},
		formButtonPrimary: {
			background: 'linear-gradient(180deg, #d7bc86, #bd9558)',
			color: '#090909',
			fontWeight: '700'
		},
		identityPreviewText: {
			color: '#f4ede1'
		},
		identityPreviewEditButton: {
			color: '#d1b27a'
		}
	} as const;

	const authAppearance = {
		layout: {
			socialButtonsVariant: 'blockButton'
		},
		variables: sharedVariables,
		elements: {
			...sharedElements,
			cardBox: {
				width: '100%',
				maxWidth: '26rem',
				marginInline: 'auto'
			},
			socialButtonsBlockButton: {
				background: 'rgba(255, 255, 255, 0.04)',
				border: '1px solid rgba(209, 178, 122, 0.18)',
				color: '#f4ede1'
			},
			socialButtonsBlockButtonText: {
				color: '#f4ede1',
				fontWeight: '600'
			},
			socialButtonsProviderIcon: {
				color: '#f4ede1'
			}
		}
	} as const;

	const profileAppearance = {
		variables: sharedVariables,
		elements: {
			...sharedElements,
			cardBox: {
				width: '100%',
				maxWidth: '100%',
				marginInline: '0'
			},
			card: {
				...sharedElements.card,
				width: '100%',
				boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)'
			}
		}
	} as const;

	const appearance = $derived(mode === 'userProfile' ? profileAppearance : authAppearance);

	onMount(() => {
		if (!browser || !host || !publishableKey) return;

		let active = true;

		void (async () => {
			try {
				const clerk = await loadBrowserClerk(publishableKey);
				if (!active) return;

				if (mode === 'signIn') {
					clerk.mountSignIn(host, {
						routing: 'path',
						path: '/login',
						signUpUrl: '/signup',
						fallbackRedirectUrl,
						forceRedirectUrl,
						appearance
					});
				} else if (mode === 'signUp') {
					clerk.mountSignUp(host, {
						routing: 'path',
						path: '/signup',
						signInUrl: '/login',
						fallbackRedirectUrl,
						forceRedirectUrl,
						appearance
					});
				} else {
					clerk.mountUserProfile(host, {
						routing: 'path',
						path: '/settings',
						appearance
					});
				}
			} catch (error) {
				console.error('Failed to mount Clerk component', error);
				mountError = missingConfigurationMessage;
			}
		})();

		return () => {
			active = false;
			if (host) {
				host.innerHTML = '';
			}
		};
	});
</script>

{#if mountError}
	<div class="mount-error" role="status" aria-live="polite">
		<p>{mountError}</p>
		<p class="mount-help">
			Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you need access before this
			environment is fully configured.
		</p>
	</div>
{:else}
	<div class:profile-mode={mode === 'userProfile'} class="mount-host" bind:this={host}></div>
{/if}

<style>
	.mount-host {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.mount-error {
		padding: 1rem 1.1rem;
		border-radius: 1rem;
		border: 1px solid rgba(165, 95, 42, 0.35);
		background: rgba(165, 95, 42, 0.08);
		color: var(--color-fg-primary);
	}

	.mount-error p {
		margin: 0;
	}

	.mount-help {
		margin-top: 0.65rem !important;
		color: var(--color-fg-secondary);
		font-size: 0.95rem;
	}

	.mount-help a {
		color: var(--color-accent);
	}

	:global(.mount-host .cl-rootBox) {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.mount-host.profile-mode {
		align-items: stretch;
		justify-content: stretch;
	}

	:global(.mount-host.profile-mode .cl-rootBox) {
		justify-content: stretch;
	}

	:global(.mount-host.profile-mode .cl-cardBox) {
		width: 100%;
		max-width: 100%;
	}

	:global(.mount-host.profile-mode .cl-card) {
		width: 100%;
	}
</style>
