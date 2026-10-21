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

// a callback raising a code reads the text configured for it
const Nickname = type("string").narrow(
	(s, ctx) =>
		s.length > 1 ||
		ctx.reject({ code: "minLength", rule: 2, description: "at least length 2" })
)
const Age = type("unknown").narrow(
	(data, ctx) =>
		typeof data === "number" ||
		ctx.reject({ code: "domain", domain: "number", description: "a number" })
)

console.log(summaryOf(Nickname("a")))
console.log(summaryOf(Age("x")))
