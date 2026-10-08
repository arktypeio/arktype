import { type } from "arktype"

const User = type({
	name: "string",
	platform: "'android' | 'ios'"
})
// ---cut---
User.extends("object") // true
User.extends({ name: "string" }) // true
User.extends({ name: "'Alan'" }) // false
