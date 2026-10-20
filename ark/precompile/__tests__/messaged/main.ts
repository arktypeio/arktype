import "./config.ts"
import { type } from "arktype"

const User = type({
	name: "string > 1",
	email: "string.email",
	age: "number <= 100"
})

const summaryOf = (out: unknown) =>
	out instanceof type.errors ? out.summary : out

console.log(summaryOf(User({ name: 1, email: "x", age: 101 })))
console.log(summaryOf(User({ name: "a", email: 5, age: "x" })))
