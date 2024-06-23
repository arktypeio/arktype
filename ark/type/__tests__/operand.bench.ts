import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("single-quoted", () => {
	const _ = type("'nineteen characters'")
}).types([1319, "instantiations"])

bench("double-quoted", () => {
	const _ = type('"nineteen characters"')
}).types([1319, "instantiations"])

bench("regex literal", () => {
	const _ = type("/nineteen characters/")
}).types([1363, "instantiations"])

bench("keyword", () => {
	const _ = type("string")
}).types([919, "instantiations"])

bench("number", () => {
	const _ = type("-98765.4321")
}).types([1139, "instantiations"])

bench("bigint", () => {
	const _ = type("-987654321n")
}).types([1157, "instantiations"])

bench("instantiations", () => {
	const t = type({ foo: "string" })
}).types([18483, "instantiations"])

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
}).types([22721, "instantiations"])
