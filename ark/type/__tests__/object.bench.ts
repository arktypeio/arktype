import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => type("never"))

bench("dictionary", () => {
	const dict = type({
		a: "string[]",
		b: "number[]",
		c: { nested: "boolean[]" }
	})
}).types([3175, "instantiations"])

bench("dictionary with optional keys", () => {
	const dict = type({
		"a?": "string[]",
		"b?": "number[]",
		"c?": { "nested?": "boolean[]" }
	})
}).types([3018, "instantiations"])

bench("tuple", () => {
	const tuple = type(["string[]", "number[]", ["boolean[]"]])
}).types([10381, "instantiations"])
