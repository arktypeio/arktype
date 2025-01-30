import "./config.ts"

import { match, type } from "arktype"

const user = type({
	name: "string",
	email: "string.email"
})

const out = user({
	name: 5,
	email: "449 Canal St"
})

console.log(out.toString())

const sizeOf = match({
	"string|Array": v => v.length,
	number: v => v,
	bigint: v => v,
	default: "never"
})

// default: "never" - throw on other value, input is narrowed
// default: "assert" - throw on other value, input is unknown
// default: "reject" - return ArkError on other value, input is unknown
// default: () => unknown - specify a default value
