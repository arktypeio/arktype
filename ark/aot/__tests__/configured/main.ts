import "./config.ts"
import { type } from "arktype"

export const User = type({
	name: "string",
	email: "string.email",
	"age?": "number % 3",
	plan: "string = 'free'"
})

export const results = [
	User({
		name: "Ada",
		email: "ada@example.com",
		age: undefined,
		plan: undefined,
		role: "x"
	}),
	User({ name: 1, email: "ada", age: 4 }),
	User.description,
	type("number").allows(Number.NaN)
]

console.log(JSON.stringify(results))
