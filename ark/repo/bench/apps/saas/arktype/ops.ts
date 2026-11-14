import { type } from "arktype"
import { Id, Slug, Timestamp } from "./common.ts"

export const AuditEntry = type({
	id: Id,
	orgId: Id,
	actorId: Id.or("null"),
	action: /^[a-z]+\.[_a-z]+$/,
	targetType: "'user' | 'project' | 'issue' | 'webhook' | 'api_key'",
	targetId: Id,
	ip: "string.ip",
	"userAgent?": "string <= 512",
	metadata: "Record<string, string>",
	at: Timestamp
})

export const FeatureFlag = type({
	key: Slug,
	enabled: "boolean",
	rolloutPercent: "0 <= number <= 100",
	"allowOrgIds?": Id.array(),
	updatedAt: Timestamp
})

export const Notification = type({
	id: Id,
	userId: Id,
	read: "boolean = false",
	createdAt: Timestamp,
	payload: type({ kind: "'mention'", issueId: Id, commentId: Id })
		.or({ kind: "'assignment'", issueId: Id })
		.or({ kind: "'digest'", count: "number.integer >= 1" })
})

export const NotificationPreferences = type({
	mentions: "'off' | 'inbox' | 'email' = 'email'",
	assignments: "'off' | 'inbox' | 'email' = 'email'",
	digest: "'off' | 'daily' | 'weekly' = 'weekly'",
	"quietHours?": {
		start: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
		end: /^(?:[01]\d|2[0-3]):[0-5]\d$/
	}
})
