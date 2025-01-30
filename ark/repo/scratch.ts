import "./config.ts"

import { match } from "arktype"

const sizeOf = match({
	"string|Array": v => v.length,
	number: v => v,
	bigint: v => v,
	default: "assert"
})
const size1 = sizeOf("foo") //?
const size = sizeOf({}) //?

console.log(size)

// default: "never" - throw on other value, input is narrowed
// default: "assert" - throw on other value, input is unknown
// default: "reject" - return ArkError on other value, input is unknown
// default: () => unknown - specify a default value
