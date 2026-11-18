import { type } from "arktype"
import { Address, Id } from "./common.ts"

export const Role = type("'admin' | 'member'")

export const User = type({
	id: Id,
	role: Role.default("member"),
	"address?": Address
})

export type User = typeof User.infer

export const Team = type({ lead: User, members: User.array() })

export const parseUser = (data: unknown): User => User.assert(data)
