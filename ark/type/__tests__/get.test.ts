import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const t = type({
			foo: "string",
			bar: "number|bigint"
		})

		attest(t.internal.indexableExpressions).snap({
			bar: "bigint | number",
			foo: "string"
		})
	})

	it("can get deep roots by path", () => {
		const t = type({
			foo: {
				baz: "1"
			},
			bar: {
				quux: "2"
			}
		})

		attest(t.internal.indexableExpressions).snap({
			bar: "{ quux: 2 }",
			"bar.quux": "2",
			foo: "{ baz: 1 }",
			"foo.baz": "1"
		})
	})
})
