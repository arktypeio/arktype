import { type } from "arktype"

const user = type({
	name: "string",
	luckyNumbers: "(number | bigint)[]",
	"isAdmin?": "boolean | null"
})

// ---cut---
user.extends("object") // true
user.extends("string") // false
// ---cut-start---
// prettier-ignore
// ---cut-end---
user.extends({ // true
	luckyNumbers: "unknown[]",
})
// ---cut-start---
// prettier-ignore
// ---cut-end---
user.extends({ // false
	luckyNumbers: "number[]"
})

// get transitively referenced TypeNodes
console.log(user.raw.references)
