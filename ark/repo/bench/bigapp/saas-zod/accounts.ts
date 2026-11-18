import * as z from "zod"
import { Email, Id, Slug, Timestamp, Url } from "./common.ts"

export const Role = z.enum(["owner", "admin", "member", "viewer"])

export const User = z.object({
	id: Id,
	email: Email,
	name: z.string().min(1).max(100),
	avatarUrl: Url.nullable(),
	createdAt: Timestamp,
	lastLoginAt: Timestamp.nullable(),
	settings: z.object({
		theme: z.enum(["light", "dark", "system"]).default("system"),
		locale: z.string().min(2).max(10).default("en"),
		emailNotifications: z.boolean().default(true)
	})
})

export const Organization = z.object({
	id: Id,
	slug: Slug,
	name: z.string().min(1).max(100),
	plan: z.enum(["free", "team", "enterprise"]),
	seats: z.number().int().min(1).max(10000),
	billingEmail: Email,
	createdAt: Timestamp
})

export const Membership = z.object({
	userId: Id,
	orgId: Id,
	role: Role,
	joinedAt: Timestamp
})

export const Invitation = z.object({
	email: Email,
	orgId: Id,
	role: z.enum(["admin", "member", "viewer"]),
	invitedBy: Id,
	expiresAt: Timestamp
})

export const ApiKey = z.object({
	id: Id,
	name: z.string().min(1).max(64),
	prefix: z.string().regex(/^sk_(?:live|test)_[\dA-Za-z]{8}$/),
	scopes: z.array(z.enum(["read", "write", "admin"])).min(1),
	expiresAt: Timestamp.nullable(),
	lastUsedAt: Timestamp.optional()
})

export const SignUp = z.object({
	email: Email,
	password: z.string().min(12).max(128),
	name: z.string().min(1).max(100),
	inviteToken: z.string().min(32).max(64).optional()
})
