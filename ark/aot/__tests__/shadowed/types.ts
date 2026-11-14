import { scope, type } from "arktype"

export const Name = type("string > 0")

export const Email = type("string.email")

// each evaluation of the morph's expression creates another function
export const morphs = new Set<unknown>()

export const Trimmed = type("string").pipe(function trim(s: string) {
	morphs.add(trim)
	return s.trim()
})

export const Person = type({ name: "string" })

export const $ = scope({ Id: "string.uuid" })

export const types = scope({
	"#Id": "string.uuid",
	User: { id: "Id", name: "string" }
}).export()
