import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => type("never"))

bench("single-quoted", () => type("'nineteen characters'")).types([
	568,
	"instantiations"
])

bench("double-quoted", () => type('"nineteen characters"')).types([
	575,
	"instantiations"
])

bench("regex literal", () => type("/nineteen characters/")).types([
	1839,
	"instantiations"
])

bench("keyword", () => type("string")).types([430, "instantiations"])

bench("number", () => type("-98765.4321")).types([457, "instantiations"])

bench("bigint", () => type("-987654321n")).types([529, "instantiations"])

bench("object", () => type({ foo: "string" })).types([703, "instantiations"])

bench("union", () =>
	// Union is automatically discriminated using shallow or deep keys
	type({
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
).types([3618, "instantiations"])
