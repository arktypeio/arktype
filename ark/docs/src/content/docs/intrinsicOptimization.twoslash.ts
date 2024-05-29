import { type } from "arktype"
// ---cut---
// all unions are optimally discriminated-
// even at nested paths or in multiple passes!
const account = type({
	kind: "'admin'",
	"powers?": "string[]"
})
	.or({
		kind: "'superadmin'",
		"superpowers?": "string[]"
	})
	.or({
		kind: "'pleb'"
	})
