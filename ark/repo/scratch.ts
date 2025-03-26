import { type } from "arktype"

const User = type({
	name: "string",
	platform: "'android' | 'ios'",
	"version?": "number | string"
})
