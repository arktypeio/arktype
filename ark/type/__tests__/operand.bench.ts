import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => type("never"))

bench("single-quoted", () => {
	const _ = type("'nineteen characters'")
}).types([697, "instantiations"])

bench("double-quoted", () => {
	const _ = type('"nineteen characters"')
}).types([697, "instantiations"])

bench("regex literal", () => {
	const _ = type("/nineteen characters/")
}).types([709, "instantiations"])

bench("keyword", () => {
	const _ = type("string")
}).types([510, "instantiations"])

bench("number", () => {
	const _ = type("-98765.4321")
}).types([479, "instantiations"])

bench("bigint", () => {
	const _ = type("-987654321n")
}).types([559, "instantiations"])

bench("object", () => {
	const t = type({ foo: "string" })
}).types([1134, "instantiations"])

bench("union", () => {
	// Union is automatically discriminated using shallow or deep keys
	const user = type({
		kind: "'admin'",
		"powers?": "string[]"
	})
		.or({
			kind: "'superadmin'",
			"superpowers?": "string[]"
		})
		.or({
			kind: "'pleb'"
		})
}).types([5287, "instantiations"])
