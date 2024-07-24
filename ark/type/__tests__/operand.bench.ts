import { bench } from "@ark/attest"
import { type } from "arktype"

type("never")

bench("single-quoted", () => {
	const _ = type("'nineteen characters'")
}).types([610, "instantiations"])

bench("double-quoted", () => {
	const _ = type('"nineteen characters"')
}).types([610, "instantiations"])

bench("regex literal", () => {
	const _ = type("/nineteen characters/")
}).types([654, "instantiations"])

bench("keyword", () => {
	const _ = type("string")
}).types([357, "instantiations"])

bench("number", () => {
	const _ = type("-98765.4321")
}).types([432, "instantiations"])

bench("bigint", () => {
	const _ = type("-987654321n")
}).types([450, "instantiations"])

bench("instantiations", () => {
	const t = type({ foo: "string" })
}).types([1207, "instantiations"])

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
}).types([5445, "instantiations"])
