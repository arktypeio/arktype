import { type } from "arktype"
// prettier-ignore
// ---cut---
// all unions are optimally discriminated
// even if multiple/nested paths are needed
const account = type({
	kind: "'admin'",
	"powers?": "string[]"
}).or({
	kind: "'superadmin'",
	"superpowers?": "string[]"
}).or({
	kind: "'pleb'"
})
