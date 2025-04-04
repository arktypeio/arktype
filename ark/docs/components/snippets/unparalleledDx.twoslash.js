// @noErrors
import { type } from "arktype"
// prettier-ignore
// ---cut---
const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | s"
	//                     ^|
})
