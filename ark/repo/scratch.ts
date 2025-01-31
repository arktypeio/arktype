import "./config.ts"

import { match, type } from "arktype"

const sizeOf = match({
	"string | Array": v => v.length,
	number: v => v,
	bigint: v => v,
	default: "assert"
})

const size = sizeOf("foo")
//    ^?
console.log(size) // 3

// narrows output from case mapping
const bigSize = sizeOf(999n)
//     ^?

// MatchError: must be a string or an object, a number or a bigint (was boolean)
const bad = sizeOf(true)
