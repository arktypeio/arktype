import { type } from "arktype"

const user = type({
	name: "string",
	platform: "'android' | 'ios'",
	"versions?": "(number | string)[]"
})

const out = user({
	name: "Alan Turing",
	platform: "enigma",
	versions: [0, "1", 0n]
})
