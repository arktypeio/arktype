import { attest, contextualize } from "@arktype/attest"
import { ark, type } from "arktype"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const t = type({
			foo: "string",
			bar: "number|bigint"
		})

		attest(t.get("bar").expression).snap("bigint | number")

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

		attest(t.get("foo", "baz").expression).snap("1")

		attest(t.get("bar", "quux").expression).snap("2")

		attest(t.internal.indexableExpressions).snap({
			bar: "{ quux: 2 }",
			"bar.quux": "2",
			foo: "{ baz: 1 }",
			"foo.baz": "1"
		})
	})

	it("can merge across a deep union", () => {
		const t = type(
			{
				foo: {
					bar: "0"
				}
			},
			"|",
			{
				foo: {
					bar: "1"
				}
			}
		)

		attest(t.get("foo", "bar").expression).snap("0 | 1")

		attest(t.internal.indexableExpressions).snap({
			foo: "{ bar: 0 } | { bar: 1 }",
			"foo.bar": "0 | 1"
		})
	})

	it("can collect multiple key types", () => {
		const t = type({
			"[string]": "string | number",
			name: "string",
			"age?": "integer < 100",
			address: {
				"[symbol]": "boolean",
				street: "string",
				"number?": "number"
			}
		}).or([
			{
				isTrue: "true"
			},
			["false", "?"]
		])

		attest(t.internal.indexableExpressions).snap({
			'["0"]': "{ isTrue: true }",
			'["0"].isTrue': "true",
			'["1"]': "[false?]",
			'["1"]["0"]': "undefined | false",
			"[string]": "number | string | undefined",
			address: "{ [symbol]: boolean, street: string, number?: number }",
			"address.number": "number | undefined",
			"address.street": "string",
			"address[symbol]": "undefined | false | true",
			age: "number % 1 & <100 | undefined",
			name: "string"
		})

		attest(t.get("1", "0").expression).snap("undefined | false")
		attest(t.get(ark.string).expression).snap("number | string | undefined")
		attest(t.get("address", Symbol()).expression).snap(
			"undefined | false | true"
		)
	})
})
