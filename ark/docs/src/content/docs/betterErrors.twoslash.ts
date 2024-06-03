import { type, type ArkErrors as BaseArkErrors } from "arktype"

const user = type({
	name: "string",
	luckyNumbers: "(number | bigint)[]",
	"isAdmin?": "boolean | null"
})

interface ArkErrors extends BaseArkErrors {
	/**luckyNumbers[1] must be a bigint or a number (was string)
name must be a string (was missing)
isAdmin must be false, null or true (was 1)*/
	summary: string
}

const narrowMessage = (e: BaseArkErrors): e is ArkErrors => true

// ---cut---
const out = user({
	luckyNumbers: [31, "255", 1337n],
	isAdmin: 1
})

if (out instanceof type.errors) {
	// ---cut-start---
	// just a trick to display the runtime error
	if (!narrowMessage(out)) throw new Error()
	// ---cut-end---
	// hover out.summary to see validation errors
	console.error(out.summary)
} else console.log(out.luckyNumbers)
