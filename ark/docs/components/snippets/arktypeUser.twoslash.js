// @exactOptionalPropertyTypes: true
import { type } from "arktype"
// ---cut---
const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "string | number"
})
