import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { writeUnboundableMessage } from "../constraints/refinements/range.js"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

describe("scope", () => {
	it("base definition", () => {
		const types = scope({ a: "string" }).export()
		attest<string>(types.a.infer)
		attest(() =>
			// @ts-expect-error
			scope({ a: "strong" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})
	it("type definition", () => {
		const types = scope({ a: type("string") }).export()
		attest<string>(types.a.infer)
		attest(() =>
			// @ts-expect-error
			scope({ a: type("strong") })
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})
	it("interdependent", () => {
		const types = scope({
			a: "string>5",
			b: "email<=10",
			c: "a&b"
		}).export()
		attest<string>(types.c.infer)
	})
	it("object array", () => {
		const types = scope({ a: "string", b: [{ c: "a" }] }).export()
		attest<
			[
				{
					c: string
				}
			]
		>(types.b.infer)
	})
	it("doesn't try to validate any in scope", () => {
		const $ = scope({ a: {} as any })
		attest<{ a: never }>($.infer)
		attest<[number, never]>($.type(["number", "a"]).infer)
	})
	it("infers input and output", () => {
		const $ = scope({
			a: ["string", "=>", (s) => s.length]
		})
		attest<{ a: number }>($.infer)
		// TODO: API?
		// attest<{ a: string }>($.in.infer)
	})
	it("scope.scope", () => {
		const $ = scope({
			a: "string"
		})
		const importer = $.scope({ b: "a[]" })
		attest<{ b: string[] }>(importer.infer)
		const t = importer.type("b")
		attest(t.json).equals(type("string[]").json)
	})
	it("infers its own helpers", () => {
		const $ = scope({
			a: () => $.type("string"),
			b: () => $.type("number")
		})
		const types = $.export()
		attest<string>(types.a.infer)
		attest<number>(types.b.infer)
	})
	it("allows semantically valid helpers", () => {
		const $ = scope({
			n: () => $.type("number"),
			lessThan10: () => $.type("n<10")
		})
		const types = $.export()
		attest<number>(types.n.infer)
		attest<number>(types.lessThan10.infer)
	})
	it("errors on helper parse error", () => {
		attest(() => {
			const $ = scope({
				// @ts-expect-error
				a: () => $.type("kung|foo")
			})
			$.export()
		}).throwsAndHasTypeError(writeUnresolvableMessage("kung"))
	})
	it("errors on semantically invalid helper", () => {
		attest(() => {
			const $ = scope({
				b: () => $.type("boolean"),
				// @ts-expect-error
				lessThan10: () => $.type("b<10")
			})
			$.export()
		})
			.throws(writeUnboundableMessage("boolean"))
			.type.errors(writeUnboundableMessage("'b'"))
	})
	it("errors on ridiculous unexpected alias scenario", () => {
		attest(() =>
			scope({
				Unexpected: {},
				User: {
					// Previously, using the alias `Unexpected` allowed creating
					// this type string which matched its own error message.
					// @ts-expect-error
					name: "Unexpected character 'c'"
				}
			}).export()
		).throwsAndHasTypeError(writeUnexpectedCharacterMessage("c"))
	})
	it("autocompletion", () => {
		attest(() => {
			scope({
				foobar: "string",
				// @ts-expect-error
				baz: "fo"
			}).export()
		}).type.errors(`Type '"fo"' is not assignable to type '"foobar"'`)
	})
	it("cross-scope reference", () => {
		const { Apple } = scope({
			Apple: {
				pear: "Pear"
			},
			Pear: {
				tasty: "true"
			}
		}).export()

		const { X } = scope({
			X: Apple
		}).export()

		const { out: data } = X({ pear: { tasty: true } })
		attest(data).snap({ pear: { tasty: true } })
	})
})
