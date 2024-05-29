import { type } from "arktype"

const user = type({
	name: "string",
	luckyNumbers: "(number | bigint)[]",
	"isAdmin?": "boolean | null"
})

// ---cut---
const out = user({
	luckyNumbers: [31, "255", 1337n],
	isAdmin: 1
})

if (out instanceof type.errors) {
	// ---cut-start---
	// just a trick to display the runtime error
	if (
		out.summary !==
		`luckyNumbers[1] must be a bigint or a number (was string)
name must be a string (was missing)
isAdmin must be false, null or true (was 1)`
	) {
		throw new Error()
	}
	// ---cut-end---
	// hover out.summary to see the validation error
	console.error(out.summary)
} else {
	console.log(out.luckyNumbers)
}
