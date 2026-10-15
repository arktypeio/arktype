import { type } from "arktype"

export const Tagged = type({
	"tags?": ["object", ["string", "=", "none"]],
	"[string]": { "[string]": { label: ["string", "=", "none"] } }
})

export const Picked = type({
	a: { n: "string.numeric.parse" },
	b: type({ inner: { k: "'x'" }, n: "string.numeric.parse" }).or({
		inner: { k: "'y'" },
		n: "string"
	})
})
