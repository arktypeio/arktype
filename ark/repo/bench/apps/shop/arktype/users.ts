import { type } from "arktype"
import { Address, Email, Id, Timestamp } from "./common.ts"

export const Role = type("'admin' | 'member' | 'guest'")

export const User = type({
	id: Id,
	email: Email,
	name: "1 <= string <= 100",
	role: Role.default("member"),
	"address?": Address,
	createdAt: Timestamp
})

export const Team = type({
	id: Id,
	name: "1 <= string <= 100",
	lead: User,
	members: User.array()
})

export const Invite = type({
	email: Email,
	role: Role,
	invitedBy: User,
	"expiresAt?": Timestamp
})
