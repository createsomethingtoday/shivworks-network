import type { PageServerLoad } from './$types';
import { getDBFromPlatform } from '$lib/server/d1-compat';
import { listVipCallBookingsForMember, listVipCallRequestsForMember } from '$lib/server/db/shivworks';
import { requireVip } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = requireVip(locals, '/vip-calls');
	const db = getDBFromPlatform(platform);

	return {
		user,
		requests: await listVipCallRequestsForMember(db, user.clerkUserId),
		bookings: await listVipCallBookingsForMember(db, user.clerkUserId)
	};
};
