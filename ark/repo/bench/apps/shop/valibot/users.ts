import * as v from "valibot"
import { Address, Email, Id, Timestamp } from "./common.ts"

export const Role = v.picklist(["admin", "member", "guest"])

export const User = v.object({
	id: Id,
	email: Email,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	role: v.optional(Role, "member"),
	address: v.optional(Address),
	createdAt: Timestamp
})

export const Team = v.object({
	id: Id,
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	lead: User,
	members: v.array(User)
})

export const Invite = v.object({
	email: Email,
	role: Role,
	invitedBy: User,
	expiresAt: v.optional(Timestamp)
})
