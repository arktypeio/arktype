import { attest, contextualize } from "@arktype/attest"
import { ark, scope, type } from "arktype"

contextualize(() => {
	it("can get shallow roots by path", () => {
		const t = type({
			foo: "string",
			bar: "number|bigint"
		})

		attest(t.get("bar").expression).snap("bigint | number")

		attest(t.internal.structuralExpressions).snap({
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

		attest(t.internal.structuralExpressions).snap({
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

		attest(t.internal.structuralExpressions).snap({
			foo: "{ bar: 0 } | { bar: 1 }",
			"foo.bar": "0 | 1"
		})
	})

	it("can collect multiple key types", () => {
		const t = type({
			"[string]": "string | number | boolean",
			name: "string",
			"age?": "integer < 100",
			address: {
				"[symbol]": "boolean",
				street: "string",
				"number?": "number"
			}
		}).and([
			{
				isTrue: "true"
			},
			["false", "?"]
		])

		attest(t.internal.structuralExpressions).snap({
			'["0"]': "{ isTrue: true }",
			'["0"].isTrue': "true",
			'["1"]': "[false?]",
			'["1"]["0"]': "undefined | false",
			"[string]": "number | string | undefined | false | true",
			address: "{ [symbol]: boolean, street: string, number?: number }",
			"address.number": "number | undefined",
			"address.street": "string",
			"address[symbol]": "undefined | false | true",
			age: "number % 1 & <100 | undefined",
			name: "string"
		})

		attest(t.get("0", "isTrue").expression).snap("true")
		attest(t.get("1", "0").expression).snap("undefined | false")
		attest(t.get(ark.string).expression).snap(
			"number | string | undefined | false | true"
		)
		attest(t.get("address", Symbol()).expression).snap(
			"undefined | false | true"
		)
	})

	it("can collect multiple key types across a union", () => {
		const types = scope({
			lOnlyIndex: /^l.*$/,
			rOnlyIndex: /^r.*$/,
			sharedIndex: /^.*lr.*$/,
			l: {
				lOnly: "1",
				"[lOnlyIndex]": "1",
				shared: {
					lOnly: "1",
					"[lOnlyIndex]": "1",
					shared: "1",
					"[sharedIndex]": "1"
				},
				"[sharedIndex]": "1"
			},
			r: {
				rOnly: "1",
				"[rOnlyIndex]": "1",
				shared: {
					rOnly: "1",
					"[rOnlyIndex]": "1",
					shared: "1",
					"[sharedIndex]": "1"
				},
				"[sharedIndex]": "1"
			}
		}).export()

		const lOrR = types.l.or(types.r)

		attest(lOrR.internal.structuralExpressions).snap({
			"[string /^.*lr.*$/]": "undefined | 1",
			"[string /^l.*$/]": "undefined | 1",
			"[string /^r.*$/]": "undefined | 1",
			lOnly: "1",
			rOnly: "1",
			shared:
				"{ [string /^.*lr.*$/]: 1, [string /^l.*$/]: 1, lOnly: 1, shared: 1 } | { [string /^.*lr.*$/]: 1, [string /^r.*$/]: 1, rOnly: 1, shared: 1 }",
			"shared.lOnly": "1",
			"shared.rOnly": "1",
			"shared.shared": "1",
			"shared[string /^.*lr.*$/]": "undefined | 1",
			"shared[string /^l.*$/]": "undefined | 1",
			"shared[string /^r.*$/]": "undefined | 1"
		})
	})
})
