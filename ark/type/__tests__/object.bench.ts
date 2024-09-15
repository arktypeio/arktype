import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type({
		_: "symbol[]",
		__: { ___: "symbol[]" }
	})

	type(["symbol[]", "symbol[]", ["symbol[]"]])
})

bench("dictionary", () => {
	const dict = type({
		a: "string[]",
		b: "number[]",
		c: { nested: "boolean[]" }
	})
}).types([2193, "instantiations"])

bench("dictionary with optional keys", () => {
	const dict = type({
		"a?": "string[]",
		"b?": "number[]",
		"c?": { "nested?": "boolean[]" }
	})
}).types([2108, "instantiations"])

bench("tuple", () => {
	const tuple = type(["string[]", "number[]", ["boolean[]"]])
}).types([3159, "instantiations"])
