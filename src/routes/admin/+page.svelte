<script lang="ts">
	import { getAudienceLabel } from '$lib/constants/tiers';
	import type { ActionData, PageData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	function toDateTimeLocal(value: number | null): string {
		if (!value) {
			return '';
		}

		const date = new Date(value);
		return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
	}
</script>

<svelte:head>
	<title>Admin | ShivWorks Network</title>
</svelte:head>

<section class="section-block">
	<div class="container stack-column">
		<div class="section-heading">
			<p class="eyebrow">Admin</p>
			<h1>Operate the ShivWorks Network without a deploy.</h1>
			<p>Manage access, course states, build-log updates, events, and VIP scheduling from one place.</p>
		</div>

		{#if form?.error}
			<div class="status-message error">{form.error}</div>
		{/if}
		{#if form?.success}
			<div class="status-message">{form.success}</div>
		{/if}

		<div class="card-grid two-up align-start">
			<form class="panel stack-form" method="POST" action="?/importMembers" enctype="multipart/form-data">
				<h2>Import purchasers</h2>
				<p>
					Upload a ShivWorks buyer export or paste CSV rows. Required columns:
					<code>email</code> and either <code>tier</code> or <code>product</code>. Optional columns:
					<code>name</code>, <code>first_name</code>, <code>last_name</code>, and <code>order_id</code>.
				</p>
				<label>
					<span>CSV file</span>
					<input name="csvFile" type="file" accept=".csv,text/csv" />
				</label>
				<label>
					<span>Or paste CSV rows</span>
					<textarea
						name="csvData"
						rows="8"
						placeholder={'email,name,tier\nmember@example.com,Craig Douglas,vip'}
					></textarea>
				</label>
				<label class="inline-checkbox">
					<input name="sendOnboardingEmail" type="checkbox" checked />
					<span>Send onboarding email after import</span>
				</label>
				<button class="btn-primary" type="submit">Import members</button>
			</form>

			<div class="panel">
				<h2>Import queue</h2>
				<div class="list-stack">
					{#if data.imports.length === 0}
						<div class="list-card">
							<strong>No purchaser imports yet.</strong>
							<p>Imported members will appear here until they finish signup and claim access.</p>
						</div>
					{:else}
						{#each data.imports as imported}
							<div class="list-card">
								<div class="member-import-head">
									<strong>{imported.name}</strong>
									<span class="membership-badge">{imported.tier.toUpperCase()}</span>
								</div>
								<p>{imported.email}</p>
								<small>
									{#if imported.claimedAt}
										Claimed {new Date(imported.claimedAt).toLocaleString()}
									{:else if imported.lastEmailedAt}
										Onboarding sent {new Date(imported.lastEmailedAt).toLocaleString()}
									{:else}
										Queued for signup
									{/if}
								</small>
								{#if imported.sourceRef}
									<small>Source ref: {imported.sourceRef}</small>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<div class="card-grid two-up align-start">
			<div class="panel">
				<h2>Members</h2>
				<div class="list-stack">
					{#each data.members as member}
						<form class="list-card member-form" method="POST" action="?/updateMember">
							<input type="hidden" name="memberId" value={member.clerkUserId} />
							<strong>{member.name}</strong>
							<p>{member.email}</p>
							<div class="inline-fields">
								<select name="tier">
									<option value="" selected={member.tier === null}>No tier</option>
									<option value="free" selected={member.tier === 'free'}>Free</option>
									<option value="bronze" selected={member.tier === 'bronze'}>Bronze</option>
									<option value="vip" selected={member.tier === 'vip'}>VIP</option>
								</select>
								<select name="accessStatus">
									<option value="none" selected={member.accessStatus === 'none'}>No access</option>
									<option value="active" selected={member.accessStatus === 'active'}>Active</option>
									<option value="revoked" selected={member.accessStatus === 'revoked'}>Revoked</option>
								</select>
								<button class="btn-secondary" type="submit">Save</button>
							</div>
						</form>
					{/each}
				</div>
			</div>

			<div class="panel">
				<h2>Courses</h2>
				<div class="list-stack">
						{#each data.courses as course}
							<form class="list-card member-form" method="POST" action="?/updateCourse">
								<input type="hidden" name="courseId" value={course.id} />
								<strong>{course.title}</strong>
								<div class="inline-fields">
								<select name="status">
									<option value="coming_soon" selected={course.status === 'coming_soon'}>Coming soon</option>
									<option value="available" selected={course.status === 'available'}>Available</option>
									<option value="archived" selected={course.status === 'archived'}>Archived</option>
								</select>
								<select name="accessTier">
									<option value="free" selected={course.accessTier === 'free'}>Free access</option>
									<option value="member" selected={course.accessTier === 'member'}>Paid members</option>
									<option value="vip" selected={course.accessTier === 'vip'}>VIP only</option>
								</select>
									<input name="badgeText" value={course.badgeText || ''} placeholder="Badge text" />
									<button class="btn-secondary" type="submit">Save</button>
								</div>
							</form>
							{#if data.modules.some((module) => module.courseId === course.id)}
								<div class="module-stack">
									{#each data.modules.filter((module) => module.courseId === course.id) as module}
										<form class="list-card stack-form module-card" method="POST" action="?/updateModule">
											<input type="hidden" name="moduleId" value={module.id} />
											<div class="inline-fields">
												<label>
													<span>Module title</span>
													<input name="title" value={module.title} required />
												</label>
												<label>
													<span>Status</span>
													<select name="status">
														<option value="coming_soon" selected={module.status === 'coming_soon'}>Coming soon</option>
														<option value="available" selected={module.status === 'available'}>Available</option>
														<option value="archived" selected={module.status === 'archived'}>Archived</option>
													</select>
												</label>
												<label>
													<span>Video type</span>
													<select name="videoKind">
														<option value="none" selected={module.videoKind === 'none'}>No playback</option>
														<option value="mp4" selected={module.videoKind === 'mp4'}>MP4</option>
														<option value="embed" selected={module.videoKind === 'embed'}>Embed</option>
													</select>
												</label>
											</div>
											<label>
												<span>Description</span>
												<textarea name="description" rows="2">{module.description || ''}</textarea>
											</label>
											<div class="inline-fields">
												<label>
													<span>Video URL</span>
													<input name="videoUrl" value={module.videoUrl || ''} placeholder="/videos/example.mp4" />
												</label>
												<label>
													<span>Duration</span>
													<input name="durationLabel" value={module.durationLabel || ''} placeholder="08 min" />
												</label>
											</div>
											<label class="inline-checkbox">
												<input name="sendReleaseEmail" type="checkbox" />
												<span>Send release alert if this update moves the module live</span>
											</label>
											<button class="btn-secondary" type="submit">Save module</button>
										</form>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>

		<div class="card-grid two-up align-start">
			<form class="panel stack-form" method="POST" action="?/createUpdate">
				<h2>Post update</h2>
				<label>
					<span>Title</span>
					<input name="title" required />
				</label>
				<label>
					<span>Audience</span>
					<select name="audience">
						<option value="free">Free access</option>
						<option value="member" selected>Paid members</option>
						<option value="vip">VIP only</option>
					</select>
				</label>
				<label>
					<span>Body</span>
					<textarea name="bodyMarkdown" rows="6" required></textarea>
				</label>
				<label class="inline-checkbox">
					<input name="sendUpdateEmail" type="checkbox" checked />
					<span>Email this update to members who opted into build updates</span>
				</label>
				<button class="btn-primary" type="submit">Publish update</button>
			</form>

			<form class="panel stack-form" method="POST" action="?/createEvent">
				<h2>Create event</h2>
				<label>
					<span>Title</span>
					<input name="title" required />
				</label>
				<label>
					<span>Description</span>
					<textarea name="description" rows="4" required></textarea>
				</label>
				<div class="inline-fields">
					<select name="eventKind">
						<option value="livestream">Livestream</option>
						<option value="vip_call">VIP call</option>
					</select>
					<select name="accessTier">
						<option value="free">Free access</option>
						<option value="member" selected>Paid members</option>
						<option value="vip">VIP only</option>
					</select>
					<select name="status">
						<option value="scheduled">Scheduled</option>
						<option value="live">Live</option>
						<option value="ended">Ended</option>
					</select>
				</div>
				<label>
					<span>Starts at</span>
					<input name="startsAt" type="datetime-local" />
				</label>
				<label>
					<span>Ends at</span>
					<input name="endsAt" type="datetime-local" />
				</label>
				<div class="inline-fields">
					<select name="locationType">
						<option value="youtube">YouTube</option>
						<option value="zoom">Zoom</option>
						<option value="external">External</option>
					</select>
					<input name="embedUrl" placeholder="Embed URL" />
				</div>
				<label>
					<span>Booking URL</span>
					<input name="bookingUrl" placeholder="Optional booking URL" />
				</label>
				<label class="inline-checkbox">
					<input name="reminderEnabled" type="checkbox" checked />
					<span>Allow RSVP reminders for this event</span>
				</label>
				<button class="btn-primary" type="submit">Create event</button>
			</form>
		</div>

		<div class="card-grid two-up align-start">
			<div class="panel">
				<h2>Recent updates</h2>
				<div class="list-stack">
					{#each data.updates as update}
						<div class="list-card">
							<strong>{update.title}</strong>
							<p>{update.bodyMarkdown}</p>
							<small>
								{getAudienceLabel(update.audience)} · {new Date(update.publishedAt).toLocaleString()}
							</small>
						</div>
					{/each}
				</div>
			</div>

			<div class="panel">
				<h2>Scheduled events</h2>
				<div class="list-stack">
					{#each data.events as event}
						<div class="list-card stack-form">
							<form class="stack-form" method="POST" action="?/updateEvent">
								<input type="hidden" name="id" value={event.id} />
								<div class="inline-fields">
									<label>
										<span>Title</span>
										<input name="title" value={event.title} required />
									</label>
									<label>
										<span>Status</span>
										<select name="status">
											<option value="scheduled" selected={event.status === 'scheduled'}>Scheduled</option>
											<option value="live" selected={event.status === 'live'}>Live</option>
											<option value="ended" selected={event.status === 'ended'}>Ended</option>
										</select>
									</label>
								</div>
								<label>
									<span>Description</span>
									<textarea name="description" rows="3">{event.description}</textarea>
								</label>
								<div class="inline-fields">
									<label>
										<span>Event kind</span>
										<select name="eventKind">
											<option value="livestream" selected={event.eventKind === 'livestream'}>Livestream</option>
											<option value="vip_call" selected={event.eventKind === 'vip_call'}>VIP call</option>
										</select>
									</label>
									<label>
										<span>Audience</span>
										<select name="accessTier">
											<option value="free" selected={event.accessTier === 'free'}>Free access</option>
											<option value="member" selected={event.accessTier === 'member'}>Paid members</option>
											<option value="vip" selected={event.accessTier === 'vip'}>VIP only</option>
										</select>
									</label>
									<label>
										<span>Location type</span>
										<select name="locationType">
											<option value="youtube" selected={event.locationType === 'youtube'}>YouTube</option>
											<option value="zoom" selected={event.locationType === 'zoom'}>Zoom</option>
											<option value="external" selected={event.locationType === 'external'}>External</option>
										</select>
									</label>
								</div>
								<div class="inline-fields">
									<label>
										<span>Starts at</span>
										<input name="startsAt" type="datetime-local" value={toDateTimeLocal(event.startsAt)} />
									</label>
									<label>
										<span>Ends at</span>
										<input name="endsAt" type="datetime-local" value={toDateTimeLocal(event.endsAt)} />
									</label>
								</div>
								<label>
									<span>Embed URL</span>
									<input name="embedUrl" type="url" value={event.embedUrl || ''} />
								</label>
								<label>
									<span>Booking URL</span>
									<input name="bookingUrl" type="url" value={event.bookingUrl || ''} />
								</label>
								<label class="inline-checkbox">
									<input name="reminderEnabled" type="checkbox" checked={event.reminderEnabled} />
									<span>Allow RSVP reminders for this event</span>
								</label>
								<button class="btn-secondary" type="submit">Save event</button>
							</form>
							{#if event.eventKind === 'livestream' && event.startsAt && event.status !== 'ended' && event.reminderEnabled}
								<form method="POST" action="?/sendReminder">
									<input type="hidden" name="eventId" value={event.id} />
									<button class="btn-secondary" type="submit">Send RSVP reminders</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="card-grid two-up align-start">
			<div class="panel">
				<h2>External links</h2>
				<div class="list-stack">
					{#each data.links as link}
						<form class="list-card stack-form" method="POST" action="?/updateLink">
							<input type="hidden" name="id" value={link.id} />
							<div class="inline-fields">
								<label>
									<span>Label</span>
									<input name="label" value={link.label} required />
								</label>
								<label>
									<span>Key</span>
									<input name="linkKey" value={link.linkKey} />
								</label>
							</div>
							<label>
								<span>URL</span>
								<input name="url" type="url" value={link.url} required />
							</label>
							<div class="inline-fields">
								<label>
									<span>Audience</span>
									<select name="audience">
										<option value="free" selected={link.audience === 'free'}>Free access</option>
										<option value="member" selected={link.audience === 'member'}>Paid members</option>
										<option value="vip" selected={link.audience === 'vip'}>VIP only</option>
									</select>
								</label>
								<label>
									<span>Sort order</span>
									<input name="sortOrder" type="number" value={link.sortOrder} />
								</label>
								<label>
									<span>CTA text</span>
									<input name="ctaText" value={link.ctaText || ''} />
								</label>
							</div>
							<label>
								<span>Description</span>
								<textarea name="description" rows="3">{link.description || ''}</textarea>
							</label>
							<button class="btn-secondary" type="submit">Save link</button>
						</form>
					{/each}
				</div>
			</div>

			<form class="panel stack-form" method="POST" action="?/createLink">
				<h2>Add external link</h2>
				<label>
					<span>Label</span>
					<input name="label" required />
				</label>
				<label>
					<span>URL</span>
					<input name="url" type="url" required />
				</label>
				<div class="inline-fields">
					<label>
						<span>Audience</span>
						<select name="audience">
							<option value="free">Free access</option>
							<option value="member" selected>Paid members</option>
							<option value="vip">VIP only</option>
						</select>
					</label>
					<label>
						<span>Sort order</span>
						<input name="sortOrder" type="number" value="0" />
					</label>
					<label>
						<span>Link key</span>
						<input name="linkKey" placeholder="optional-internal-key" />
					</label>
				</div>
				<label>
					<span>Description</span>
					<textarea name="description" rows="4"></textarea>
				</label>
				<label>
					<span>CTA text</span>
					<input name="ctaText" placeholder="Open resource" />
				</label>
				<button class="btn-primary" type="submit">Add link</button>
			</form>
		</div>

		<div class="panel">
			<h2>VIP call requests</h2>
			<div class="list-stack">
				{#if data.vipRequests.length === 0}
					<div class="list-card">
						<strong>No open VIP requests</strong>
						<p>New requests will appear here as members submit them from the product.</p>
					</div>
				{:else}
					{#each data.vipRequests as request}
						<form class="list-card stack-form" method="POST" action="?/approveVip">
							<strong>{request.memberName || 'VIP member'}</strong>
							<p>{request.memberEmail || request.memberId}</p>
							<p>{request.goals}</p>
							{#if request.preferredMonth}
								<p><strong>Preferred month:</strong> {request.preferredMonth}</p>
							{/if}
							{#if request.notes}
								<p><strong>Notes:</strong> {request.notes}</p>
							{/if}
							<input type="hidden" name="requestId" value={request.id} />
							<input type="hidden" name="memberId" value={request.memberId} />
							<div class="inline-fields">
								<input name="startsAt" type="datetime-local" required />
								<input name="endsAt" type="datetime-local" required />
							</div>
							<label>
								<span>Zoom join URL</span>
								<input name="zoomJoinUrl" placeholder="https://zoom.us/j/..." />
							</label>
							<button class="btn-secondary" type="submit">Approve and schedule</button>
						</form>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.member-import-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
</style>
