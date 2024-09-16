import { type } from "arktype"
import assert from "node:assert"

export const cloudinaryResource = type({
	"[string]": "unknown",
	"alt?": "string",
	"caption?": "string"
})

const o = cloudinaryResource.optional()

assert.strictEqual({ foo: "string" }, { foo: "bar" })
