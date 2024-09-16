import { type, type Type } from "arktype"

export const cloudinaryResource = type({
	"[string]": "unknown",
	"alt?": "string",
	"caption?": "string"
})

const o = cloudinaryResource.optional()
