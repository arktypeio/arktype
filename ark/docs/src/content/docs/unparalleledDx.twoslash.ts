import { type } from "arktype"
// ---cut---
// hover me
const user = type({
	name: "string",
	luckyNumbers: "number[]",
	// ---cut-start---
	// @ts-expect-error
	// ---cut-end---
	"isAdmin?": "boolean | n"
	//				                  ^|
})
