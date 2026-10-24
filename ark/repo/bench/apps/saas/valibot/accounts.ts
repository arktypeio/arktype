import * as v from "valibot"
import { Email, Id, Slug, Timestamp, Url } from "./common.ts"

export const Role = v.picklist(["owner", "admin", "member", "viewer"])

export const User = v.object({
	id: Id,
	email: Email,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	avatarUrl: v.nullable(Url),
	createdAt: Timestamp,
	lastLoginAt: v.nullable(Timestamp),
	settings: v.object({
		theme: v.optional(v.picklist(["light", "dark", "system"]), "system"),
		locale: v.optional(
			v.pipe(v.string(), v.minLength(2), v.maxLength(10)),
			"en"
		),
		emailNotifications: v.optional(v.boolean(), true)
	})
})

export const Organization = v.object({
	id: Id,
	slug: Slug,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	plan: v.picklist(["free", "team", "enterprise"]),
	seats: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10000)),
	billingEmail: Email,
	createdAt: Timestamp
})

export const Membership = v.object({
	userId: Id,
	orgId: Id,
	role: Role,
	joinedAt: Timestamp
})

export const Invitation = v.object({
	email: Email,
	orgId: Id,
	role: v.picklist(["admin", "member", "viewer"]),
	invitedBy: Id,
	expiresAt: Timestamp
})

export const ApiKey = v.object({
	id: Id,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
	prefix: v.pipe(v.string(), v.regex(/^sk_(?:live|test)_[\dA-Za-z]{8}$/)),
	scopes: v.pipe(
		v.array(v.picklist(["read", "write", "admin"])),
		v.minLength(1)
	),
	expiresAt: v.nullable(Timestamp),
	lastUsedAt: v.optional(Timestamp)
})

export const SignUp = v.object({
	email: Email,
	password: v.pipe(v.string(), v.minLength(12), v.maxLength(128)),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	inviteToken: v.optional(v.pipe(v.string(), v.minLength(32), v.maxLength(64)))
})
