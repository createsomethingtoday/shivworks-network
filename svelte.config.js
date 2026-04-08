import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isReplitPreview = Boolean(process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(
			isReplitPreview
				? {
						platformProxy: {
							configPath: './wrangler.replit.jsonc',
							persist: false,
							remoteBindings: false
						}
					}
				: undefined
		)
	}
};

export default config;
