import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type({
		_: "symbol[]",
		__: { ___: "symbol[]" }
	})

	type(["symbol[]", "symbol[]", ["symbol[]"]])
})

bench("object literal", () =>
	type({
		a: "string[]",
		b: "number[]",
		c: { nested: "boolean[]" }
	})
).types([2257, "instantiations"])

bench("declared object literal", () => {
	type
		.declare<{
			a: string[]
			b: number[]
			c: {
				nested: boolean[]
			}
		}>()
		.type({
			a: "string[]",
			b: "number[]",
			c: { nested: "boolean[]" }
		})
}).types([3962, "instantiations"])

bench("object literal with optional keys", () =>
	type({
		"a?": "string[]",
		"b?": "number[]",
		"c?": { "nested?": "boolean[]" }
	})
).types([2082, "instantiations"])

bench("tuple", () => type(["string[]", "number[]", ["boolean[]"]])).types([
	2793,
	"instantiations"
])

bench("inline definition", () =>
	type({
		a: "string"
	})
).types([763, "instantiations"])

bench("referenced type", () => {
	const A = type("string")
	return type({
		A
	})
}).types([954, "instantiations"])

// https://github.com/arktypeio/arktype/issues/787
bench("inline reference", () =>
	type({
		a: type("string")
	})
).types([970, "instantiations"])

bench("nested type invocations", () =>
	type({
		foo: type({
			bar: type({
				zoo: "string[]"
			})
				.array()
				.or("number"),
			superBar: type([
				type("string"),
				type("number[]"),
				type({ inner: type("boolean") })
			])
		})
			.or({
				baz: "string",
				quux: "1 | 2 | 3"
			})
			.array()
	})
).types([9186, "instantiations"])
