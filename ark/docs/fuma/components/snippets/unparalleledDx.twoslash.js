// @noErrors
import { type } from "arktype"
// prettier-ignore
// ---cut---
const user = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | s"
	//                     ^|
})
