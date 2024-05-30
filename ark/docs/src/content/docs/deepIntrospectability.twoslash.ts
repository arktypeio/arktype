import { type } from "arktype"

const user = type({
	name: "string",
	luckyNumbers: "(number | bigint)[]",
	"isAdmin?": "boolean | null"
})

// ---cut---
user.extends("object") // true
user.extends("string") // false
// true (number | bigint is narrower than unknown)
user.extends({
	luckyNumbers: "unknown[]"
})
// false (number | bigint is wider than number)
user.extends({
	luckyNumbers: "number[]"
})
