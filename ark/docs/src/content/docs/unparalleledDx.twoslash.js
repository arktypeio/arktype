// @noErrors
import { type } from "arktype"
// ---cut---
// hover me
const user = type({
	name: "string",
	luckyNumbers: "number[]",
	"isAdmin?": "boolean | n"
	//				                  ^|
})
