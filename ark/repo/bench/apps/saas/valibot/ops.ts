import * as v from "valibot"
import { Id, Slug, Timestamp } from "./common.ts"

export const AuditEntry = v.object({
	id: Id,
	orgId: Id,
	actorId: v.nullable(Id),
	action: v.pipe(v.string(), v.regex(/^[a-z]+\.[_a-z]+$/)),
	targetType: v.picklist(["user", "project", "issue", "webhook", "api_key"]),
	targetId: Id,
	ip: v.pipe(v.string(), v.ip()),
	userAgent: v.optional(v.pipe(v.string(), v.maxLength(512))),
	metadata: v.record(v.string(), v.string()),
	at: Timestamp
})

export const FeatureFlag = v.object({
	key: Slug,
	enabled: v.boolean(),
	rolloutPercent: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
	allowOrgIds: v.optional(v.array(Id)),
	updatedAt: Timestamp
})

export const Notification = v.object({
	id: Id,
	userId: Id,
	read: v.optional(v.boolean(), false),
	createdAt: Timestamp,
	payload: v.variant("kind", [
		v.object({ kind: v.literal("mention"), issueId: Id, commentId: Id }),
		v.object({ kind: v.literal("assignment"), issueId: Id }),
		v.object({
			kind: v.literal("digest"),
			count: v.pipe(v.number(), v.integer(), v.minValue(1))
		})
	])
})

const Channel = v.picklist(["off", "inbox", "email"])

const Clock = v.pipe(v.string(), v.regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/))

export const NotificationPreferences = v.object({
	mentions: v.optional(Channel, "email"),
	assignments: v.optional(Channel, "email"),
	digest: v.optional(v.picklist(["off", "daily", "weekly"]), "weekly"),
	quietHours: v.optional(v.object({ start: Clock, end: Clock }))
})
