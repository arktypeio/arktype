import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeUnboundableMessage } from "../parser/semantic/bounds.js"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

suite("scope", () => {
	test("base definition", () => {
		const types = scope({ a: "string" }).export()
		attest(types.a.infer).typed as string
		attest(() =>
			// @ts-expect-error
			scope({ a: "strong" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})
	test("type definition", () => {
		const types = scope({ a: type("string") }).export()
		attest(types.a.infer).typed as string
		attest(() =>
			// @ts-expect-error
			scope({ a: type("strong") })
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})
	test("interdependent", () => {
		const types = scope({
			a: "string>5",
			b: "email<=10",
			c: "a&b"
		}).export()
		attest(types.c.infer).typed as string
	})
	test("object array", () => {
		const types = scope({ a: "string", b: [{ c: "a" }] }).export()
		attest(types.b.infer).typed as [
			{
				c: string
			}
		]
	})
	test("doesn't try to validate any in scope", () => {
		// const $ = scope({ a: {} as any })
		// attest($.infer).typed as { a: never }
		// attest($.type(["number", "a"]).infer).typed as [number, never]
	})
	test("infers input and output", () => {
		const $ = scope({
			a: ["string", "=>", (s) => s.length]
		})
		attest($.infer).typed as { a: number }
		attest($.inferIn).typed as { a: string }
	})
	test("scope.scope", () => {
		const $ = scope({
			a: "string"
		})
		const importer = $.scope({ b: "a[]" })
		attest(importer.infer).typed as { b: string[] }
		const t = importer.type("b")
		attest(t.condition).is(type("string[]").condition)
	})
	test("infers its own helpers", () => {
		const $ = scope({
			a: () => $.type("string"),
			b: () => $.type("number")
		})
		const types = $.export()
		attest(types.a.infer).typed as string
		attest(types.b.infer).typed as number
	})
	test("allows semantically valid helpers", () => {
		const $ = scope({
			n: () => $.type("number"),
			lessThan10: () => $.type("n<10")
		})
		const types = $.export()
		attest(types.n.infer).typed as number
		attest(types.lessThan10.infer).typed as number
	})
	test("errors on helper parse error", () => {
		attest(() => {
			const $ = scope({
				// @ts-expect-error
				a: () => $.type("kung|foo")
			})
			$.export()
		}).throwsAndHasTypeError(writeUnresolvableMessage("kung"))
	})
	test("errors on semantically invalid helper", () => {
		attest(() => {
			const $ = scope({
				b: () => $.type("boolean"),
				// @ts-expect-error
				lessThan10: () => $.type("b<10")
			})
			$.export()
		}).throwsAndHasTypeError(writeUnboundableMessage("'b'"))
	})
	test("errors on ridiculous unexpected alias scenario", () => {
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
	test("autocompletion", () => {
		attest(() => {
			scope({
				foobar: "string",
				// @ts-expect-error
				baz: "fo"
			}).export()
		}).types.errors(`Type '"fo"' is not assignable to type '"foobar"'`)
	})
	test("cross-scope reference", () => {
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

		const { data } = X({ pear: { tasty: true } })
		attest(data).snap({ pear: { tasty: true } })
	})
})
