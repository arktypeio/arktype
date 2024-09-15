import { type } from "arktype"

export const cloudinaryResource = type({
	"[string]": "unknown",
	"alt?": "string",
	"caption?": "string"
})

const user = type({
	name: "string",
	device: {
		platform: "'android' | 'ios'",
		"version?": "number | string"
	}
})

// ---cut---
user.extends("object") // true
user.extends("string") // false
// true (string is narrower than unknown)
user.extends({
	name: "unknown"
})
// false (string is wider than "Alan")
user.extends({
	name: "'Alan'"
})
