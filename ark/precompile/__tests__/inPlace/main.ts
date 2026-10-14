import { type } from "arktype"

export const Tagged = type({
	"tags?": ["object", ["string", "=", "none"]],
	"[string]": { "[string]": { label: ["string", "=", "none"] } }
})
