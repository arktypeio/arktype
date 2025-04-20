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
).types([2492, "instantiations"])

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
}).types([4139, "instantiations"])

bench("object literal with optional keys", () =>
	type({
		"a?": "string[]",
		"b?": "number[]",
		"c?": { "nested?": "boolean[]" }
	})
).types([2317, "instantiations"])

bench("tuple", () => type(["string[]", "number[]", ["boolean[]"]])).types([
	3026,
	"instantiations"
])

bench("inline definition", () =>
	type({
		a: "string"
	})
).types([909, "instantiations"])

bench("referenced type", () => {
	const A = type("string")
	return type({
		A
	})
}).types([1115, "instantiations"])

// https://github.com/arktypeio/arktype/issues/787
bench("inline reference", () =>
	type({
		a: type("string")
	})
).types([1131, "instantiations"])

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
).types([12909, "instantiations"])
