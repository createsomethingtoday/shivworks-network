declare global {
	namespace App {
		interface Locals {
			auth: {
				userId: string | null;
				sessionId: string | null;
				isAuthenticated: boolean;
			};
			user:
				| {
						clerkUserId: string;
						email: string;
						name: string;
						tier: 'free' | 'bronze' | 'vip' | null;
						accessStatus: 'none' | 'active' | 'revoked';
						role: 'member' | 'admin';
						createdAt: string;
						updatedAt: string;
				  }
				| null;
		}

		interface Platform {
			env: {
				DB?: import('@cloudflare/workers-types').D1Database;
				ENVIRONMENT?: string;
				PUBLIC_SITE_URL?: string;
				PUBLIC_SHIVWORKS_MAIN_SITE?: string;
				PUBLIC_SHIVWORKS_STORE_URL?: string;
				PUBLIC_SHIVWORKS_MEMBERSHIP_URL?: string;
				PUBLIC_CIRCLE_COMMUNITY_URL?: string;
				PUBLIC_SUPPORT_EMAIL?: string;
			PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
			CLERK_SECRET_KEY?: string;
			CLERK_JWT_KEY?: string;
			CLERK_WEBHOOK_SIGNING_SECRET?: string;
			CLERK_AUTHORIZED_PARTIES?: string;
			STRIPE_SECRET_KEY?: string;
			STRIPE_WEBHOOK_SECRET?: string;
				STRIPE_BRONZE_PRICE_ID?: string;
				STRIPE_VIP_PRICE_ID?: string;
				RESEND_API_KEY?: string;
				EMAIL_FROM?: string;
				SHIVWORKS_ADMIN_EMAILS?: string;
				SUPPORT_EMAIL?: string;
			};
		}
	}
}

export {};
