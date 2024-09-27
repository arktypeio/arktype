import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => type("never"))

bench("single-quoted", () => type("'nineteen characters'")).types([
	708,
	"instantiations"
])

bench("double-quoted", () => type('"nineteen characters"')).types([
	708,
	"instantiations"
])

bench("regex literal", () => type("/nineteen characters/")).types([
	720,
	"instantiations"
])

bench("keyword", () => type("string")).types([534, "instantiations"])

bench("number", () => type("-98765.4321")).types([485, "instantiations"])

bench("bigint", () => type("-987654321n")).types([564, "instantiations"])

bench("object", () => type({ foo: "string" })).types([1226, "instantiations"])

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
).types([5723, "instantiations"])
