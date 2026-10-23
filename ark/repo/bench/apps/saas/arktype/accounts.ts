import { type } from "arktype"
import { Email, Id, Slug, Timestamp, Url } from "./common.ts"

export const Role = type("'owner' | 'admin' | 'member' | 'viewer'")

export const User = type({
	id: Id,
	email: Email,
	name: "1 <= string <= 100",
	avatarUrl: Url.or("null"),
	createdAt: Timestamp,
	lastLoginAt: Timestamp.or("null"),
	settings: {
		theme: "'light' | 'dark' | 'system' = 'system'",
		locale: "2 <= string <= 10 = 'en'",
		emailNotifications: "boolean = true"
	}
})

export const Organization = type({
	id: Id,
	slug: Slug,
	name: "1 <= string <= 100",
	plan: "'free' | 'team' | 'enterprise'",
	seats: "1 <= number.integer <= 10000",
	billingEmail: Email,
	createdAt: Timestamp
})

export const Membership = type({
	userId: Id,
	orgId: Id,
	role: Role,
	joinedAt: Timestamp
})

export const Invitation = type({
	email: Email,
	orgId: Id,
	role: Role.exclude("'owner'"),
	invitedBy: Id,
	expiresAt: Timestamp
})

export const ApiKey = type({
	id: Id,
	name: "1 <= string <= 64",
	prefix: /^sk_(?:live|test)_[\dA-Za-z]{8}$/,
	scopes: "('read' | 'write' | 'admin')[] > 0",
	expiresAt: Timestamp.or("null"),
	"lastUsedAt?": Timestamp
})

export const SignUp = type({
	email: Email,
	password: "12 <= string <= 128",
	name: "1 <= string <= 100",
	"inviteToken?": "32 <= string <= 64"
})
