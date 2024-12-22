import { type, type ArkErrors } from "arktype"

const user = type({
	name: "string",
	platform: "'android' | 'ios'",
	"versions?": "(number | string)[]"
})

interface RuntimeErrors extends ArkErrors {
	/**platform must be "android" or "ios" (was "enigma")
versions[2] must be a number or a string (was bigint)*/
	summary: string
}

const narrowMessage = (e: ArkErrors): e is RuntimeErrors => true

// ---cut---
const out = user({
	name: "Alan Turing",
	platform: "enigma",
	versions: [0, "1", 0n]
})

if (out instanceof type.errors) {
	// ---cut-start---
	if (!narrowMessage(out)) throw new Error()
	// ---cut-end---
	// hover summary to see validation errors
	console.error(out.summary)
}
