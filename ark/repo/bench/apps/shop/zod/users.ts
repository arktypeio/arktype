import * as z from "zod"
import { Address, Email, Id, Timestamp } from "./common.ts"

export const Role = z.enum(["admin", "member", "guest"])

export const User = z.object({
	id: Id,
	email: Email,
	name: z.string().min(1).max(100),
	role: Role.default("member"),
	address: Address.optional(),
	createdAt: Timestamp
})

export const Team = z.object({
	id: Id,
	name: z.string().min(1).max(100),
	lead: User,
	members: z.array(User)
})

export const Invite = z.object({
	email: Email,
	role: Role,
	invitedBy: User,
	expiresAt: Timestamp.optional()
})
