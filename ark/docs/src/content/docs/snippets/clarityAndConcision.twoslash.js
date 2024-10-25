// @errors: 2322
import { type } from "arktype"
// this file is written in JS so that it can include a syntax error
// without creating a type error while still displaying the error in twoslash
// ---cut---
// hover me
const user = type({
	name: "string",
	platform: "'android' | 'ios'",
	"versions?": "number | string)[]"
})
