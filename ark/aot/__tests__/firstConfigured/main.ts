import "./config.ts"
import { type } from "arktype"

export const User = type({ name: "string", age: "number" })

const out = User({ name: 1, age: "1" })

// a validator's messages are its own, so only what each issue holds is printed
console.log(
	out instanceof type.errors &&
		JSON.stringify(out.issues.map(({ code, path, data }) => [code, path, data]))
)
