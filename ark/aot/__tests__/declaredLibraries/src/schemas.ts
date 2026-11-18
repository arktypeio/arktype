import { scope, type } from "arktype"

export const Account = type({ id: "string", email: "string.email" })

// its input and output differ from each other and from its definition
export const Signup = type({
	email: "string.email",
	age: "string.numeric.parse",
	role: "'admin' | 'member' = 'member'",
	"referrer?": Account
})

export const types = scope({
	comment: { body: "string", "replies?": "comment[]" },
	thread: { title: "string", comments: "comment[]" }
}).export()
