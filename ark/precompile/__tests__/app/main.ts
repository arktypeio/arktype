import { type } from "arktype"
import { Handle, Payload, Profile, User, Users } from "./schemas.ts"

const ada = { name: "Ada", email: "ada@example.com", age: 36, tags: ["math"] }

const samples: [(data: unknown) => unknown, unknown][] = [
	[User, ada],
	[
		User,
		{ ...ada, name: "", email: "ada", age: 36.5, tags: [1, "b", "c", "d"] }
	],
	[User, { ...ada, role: "owner", plan: "team" }],
	[Users, [ada, { ...ada, age: -1 }]],
	[Payload, { kind: "create", user: ada, extra: true }],
	[Payload, { kind: "delete", id: "c4a760a8-dbcf-4e14-9f39-645a8e933d74" }],
	[Payload, { kind: "delete", id: "1234" }],
	[Payload, { kind: "update" }],
	[Handle, " @ada "],
	[Profile, { handle: "@ada", joined: "2020-06-01" }],
	[Profile, { handle: "ada", joined: "2020-06-01" }]
]

console.log(
	JSON.stringify(
		samples.map(([validate, data]) => {
			const out = validate(data)
			return out instanceof type.errors ? out.summary : out
		})
	)
)
