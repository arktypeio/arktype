import { type } from "arktype"

const User = type({
	name: "string",
	platform: "'android' | 'ios'"
})
// ---cut---
const out = User({ name: "Alan Turing", platform: "enigma" })

if (out instanceof type.errors) console.error(out.summary)
// ArkErrors: platform must be "android" or "ios" (was "enigma")
