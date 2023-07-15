import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("dictionary", () => {
	const dict = type({
		a: "string[]",
		b: "number[]",
		c: { nested: "boolean[]" }
	})
})
	.median([20.83, "us"])
	.types([1704, "instantiations"])

bench("dictionary with optional keys", () => {
	const dict = type({
		"a?": "string[]",
		"b?": "number[]",
		"c?": { "nested?": "boolean[]" }
	})
})
	.median([21.23, "us"])
	.types([1704, "instantiations"])

bench("tuple", () => {
	const tuple = type(["string[]", "number[]", ["boolean[]"]])
})
	.median([28.6, "us"])
	.types([2739, "instantiations"])
