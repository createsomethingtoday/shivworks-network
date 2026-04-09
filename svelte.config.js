import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isReplitPreview = Boolean(process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS);
const isReplitDeployment = process.env.SHIVWORKS_DEPLOY_TARGET === 'replit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: isReplitDeployment
			? adapterNode()
			: adapterCloudflare(
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
