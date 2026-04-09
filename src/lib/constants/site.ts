const runtimeEnv =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

export const SITE_NAME = 'ShivWorks Network';
export const SITE_TAGLINE = 'The private training platform for ShivWorks members.';
export const SITE_URL =
  runtimeEnv.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://network.shivworks.com';
export const SHIVWORKS_MAIN_SITE =
  runtimeEnv.PUBLIC_SHIVWORKS_MAIN_SITE ||
  process.env.PUBLIC_SHIVWORKS_MAIN_SITE ||
  'https://shivworks.com';
export const SHIVWORKS_STORE_URL =
  runtimeEnv.PUBLIC_SHIVWORKS_STORE_URL ||
  process.env.PUBLIC_SHIVWORKS_STORE_URL ||
  'https://shivworkspg.com';
export const SHIVWORKS_MEMBERSHIP_URL =
  runtimeEnv.PUBLIC_SHIVWORKS_MEMBERSHIP_URL ||
  process.env.PUBLIC_SHIVWORKS_MEMBERSHIP_URL ||
  'https://shivworkspg.com/theshivworksnetwork/';
export const CIRCLE_COMMUNITY_URL =
  runtimeEnv.PUBLIC_CIRCLE_COMMUNITY_URL || process.env.PUBLIC_CIRCLE_COMMUNITY_URL || '';
export const SUPPORT_EMAIL =
  runtimeEnv.PUBLIC_SUPPORT_EMAIL ||
  runtimeEnv.SUPPORT_EMAIL ||
  process.env.PUBLIC_SUPPORT_EMAIL ||
  process.env.SUPPORT_EMAIL ||
  'network@shivworks.com';

export const SOCIAL_LINKS = [
	{ label: 'Instagram', href: 'https://www.instagram.com/shivworks_official/' },
	{ label: 'YouTube', href: 'https://www.youtube.com/@shivworks' },
	{ label: 'Facebook', href: 'https://www.facebook.com/shivworks' },
	{ label: 'TikTok', href: 'https://www.tiktok.com/@shivworks' }
];

export const PRIMARY_NAV = [
	{ label: 'Dashboard', href: '/dashboard' },
	{ label: 'Library', href: '/library' },
	{ label: 'Updates', href: '/updates' },
	{ label: 'Live', href: '/live' },
	{ label: 'Community', href: '/community' }
];
