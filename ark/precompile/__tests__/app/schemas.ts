import { type } from "arktype"

export const Email = type("string.email")

export const User = type({
	name: "0 < string <= 32",
	email: Email,
	age: "number.integer >= 0",
	"role?": "'admin' | 'member'",
	tags: "string[] <= 3",
	plan: "'free' | 'pro' = 'free'"
})

export const Users = User.array()

export const Payload = type({
	"+": "delete",
	kind: "'create'",
	user: User
}).or({
	kind: "'delete'",
	id: "string.uuid"
})
