<script lang="ts">
	import { SHIVWORKS_MAIN_SITE, SHIVWORKS_STORE_URL, SITE_NAME, SOCIAL_LINKS, SUPPORT_EMAIL } from '$lib/constants/site';
</script>

<footer class="site-footer">
	<div class="container footer-grid">
		<div class="footer-block">
			<p class="footer-kicker">{SITE_NAME}</p>
			<p>
				Private member platform for curriculum releases, live training, build notes, and ShivWorks
				network access.
			</p>
		</div>

		<div class="footer-block">
			<p class="footer-kicker">External</p>
			<a href={SHIVWORKS_MAIN_SITE} target="_blank" rel="noreferrer">ShivWorks.com</a>
			<a href={SHIVWORKS_STORE_URL} target="_blank" rel="noreferrer">Products Group</a>
			<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
		</div>

		<div class="footer-block">
			<p class="footer-kicker">Follow</p>
			{#each SOCIAL_LINKS as item}
				<a href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
			{/each}
		</div>
	</div>
</footer>

<style>
	.site-footer {
		position: relative;
		margin-top: 4rem;
		padding: 3rem 0 3.2rem;
		border-top: 1px solid rgba(209, 178, 122, 0.12);
		background: linear-gradient(180deg, rgba(8, 8, 8, 0.92), rgba(5, 5, 5, 0.98));
	}

	.site-footer::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(209, 178, 122, 0.48), transparent);
	}

	.footer-grid {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr;
		gap: 1.5rem;
	}

	.footer-block {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.footer-kicker {
		margin: 0 0 0.3rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-accent);
	}

	.footer-block p,
	.footer-block a {
		margin: 0;
		color: var(--color-fg-muted);
		text-decoration: none;
	}

	.footer-block a:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 760px) {
		.footer-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
