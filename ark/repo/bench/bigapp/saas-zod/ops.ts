import * as z from "zod"
import { Id, Slug, Timestamp } from "./common.ts"

export const AuditEntry = z.object({
	id: Id,
	orgId: Id,
	actorId: Id.nullable(),
	action: z.string().regex(/^[a-z]+\.[_a-z]+$/),
	targetType: z.enum(["user", "project", "issue", "webhook", "api_key"]),
	targetId: Id,
	ip: z.union([z.ipv4(), z.ipv6()]),
	userAgent: z.string().max(512).optional(),
	metadata: z.record(z.string(), z.string()),
	at: Timestamp
})

export const FeatureFlag = z.object({
	key: Slug,
	enabled: z.boolean(),
	rolloutPercent: z.number().min(0).max(100),
	allowOrgIds: z.array(Id).optional(),
	updatedAt: Timestamp
})

export const Notification = z.object({
	id: Id,
	userId: Id,
	read: z.boolean().default(false),
	createdAt: Timestamp,
	payload: z.discriminatedUnion("kind", [
		z.object({ kind: z.literal("mention"), issueId: Id, commentId: Id }),
		z.object({ kind: z.literal("assignment"), issueId: Id }),
		z.object({ kind: z.literal("digest"), count: z.number().int().min(1) })
	])
})

const Channel = z.enum(["off", "inbox", "email"])

const Clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)

export const NotificationPreferences = z.object({
	mentions: Channel.default("email"),
	assignments: Channel.default("email"),
	digest: z.enum(["off", "daily", "weekly"]).default("weekly"),
	quietHours: z.object({ start: Clock, end: Clock }).optional()
})
