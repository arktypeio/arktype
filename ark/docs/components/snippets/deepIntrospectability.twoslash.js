import { type } from "arktype"

const User = type({
	name: "string",
	device: {
		platform: "'android' | 'ios'",
		"version?": "number | string"
	}
})

// ---cut---
User.extends("object") // true
User.extends("string") // false
// true (string is narrower than unknown)
User.extends({
	name: "unknown"
})
// false (string is wider than "Alan")
User.extends({
	name: "'Alan'"
})
