const publicEnv = import.meta.env;

export const SITE_NAME = 'ShivWorks Network';
export const SITE_TAGLINE = 'The private training platform for ShivWorks members.';
export const SITE_URL = publicEnv.PUBLIC_SITE_URL || 'https://network.shivworks.com';
export const SHIVWORKS_MAIN_SITE =
	publicEnv.PUBLIC_SHIVWORKS_MAIN_SITE || 'https://shivworks.com';
export const SHIVWORKS_STORE_URL =
	publicEnv.PUBLIC_SHIVWORKS_STORE_URL || 'https://shivworkspg.com';
export const SHIVWORKS_MEMBERSHIP_URL =
	publicEnv.PUBLIC_SHIVWORKS_MEMBERSHIP_URL ||
	'https://shivworkspg.com/theshivworksnetwork/';
export const CIRCLE_COMMUNITY_URL = publicEnv.PUBLIC_CIRCLE_COMMUNITY_URL || '';
export const SUPPORT_EMAIL = publicEnv.PUBLIC_SUPPORT_EMAIL || 'network@shivworks.com';

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
