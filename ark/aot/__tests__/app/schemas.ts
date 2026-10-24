import { type } from "./ark.ts"

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

export const Handle = type("string")
	.pipe(s => s.trim())
	.narrow((s, ctx) => /^@\w+$/.test(s) || ctx.mustBe("a handle"))

export const Profile = type({
	handle: Handle,
	joined: ["string", "=>", (s: string) => new Date(s).getUTCFullYear()]
})
