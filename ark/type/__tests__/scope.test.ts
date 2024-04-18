import { attest, contextualize } from "@arktype/attest"
import {
	writeUnboundableMessage,
	writeUnresolvableMessage
} from "@arktype/schema"
import { define, scope, type } from "arktype"
import { writeUnexpectedCharacterMessage } from "../parser/string/shift/operator/operator.js"

contextualize(() => {
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
	// TODO: remove if not preserving
	// it("scope.scope", () => {
	// 	const $ = scope({
	// 		a: "string"
	// 	})
	// 	const importer = $.scope({ b: "a[]" })
	// 	attest<{ b: string[] }>(importer.infer)
	// 	const t = importer.type("b")
	// 	attest(t.json).equals(type("string[]").json)
	// })

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
	describe("define", () => {
		it("ark", () => {
			const def = define({
				a: "string|number",
				b: ["boolean"],
				c: "this"
			})
			attest<{ a: "string|number"; b: ["boolean"]; c: "this" }>(def)
		})

		it("ark error", () => {
			// currently is a no-op, so only has type error
			// @ts-expect-error
			attest(define({ a: "boolean|foo" })).type.errors(
				writeUnresolvableMessage("foo")
			)
		})

		it("custom scope", () => {
			const $ = scope({
				a: "string[]"
			})
			const ok = $.define(["a[]|boolean"])
			attest<["a[]|boolean"]>(ok)
			// @ts-expect-error
			attest($.define({ not: "ok" })).type.errors(
				writeUnresolvableMessage("ok")
			)
		})
	})
})
