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
			a: ["string", "=>", s => s.length]
		})
		attest<{ a: number }>($.infer)

		attest<{ a: string }>($.inferIn)
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

		const out = X({ pear: { tasty: true } })
		attest(out).snap({ pear: { tasty: true } })
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
	describe("cyclic", () => {
		it("base", () => {
			const types = scope({ a: { b: "b" }, b: { a: "a" } }).export()

			const a = {} as { b: typeof b }
			const b = { a }
			a.b = b

			attest(types.a(a)).equals(a)
			attest(types.a({ b: { a: { b: { a: 5 } } } }).toString()).snap(
				"b.a.b.a must be an object (was number)"
			)

			// Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
			attest({} as typeof types.a.infer).type.toString.snap()
			attest({} as typeof types.b.infer.a.b.a.b.a.b.a).type.toString.snap()

			// @ts-expect-error
			attest({} as typeof types.a.infer.b.a.b.c).type.errors.snap(
				`Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
			)
		})

		const getCyclicScope = () =>
			scope({
				package: {
					name: "string",
					"dependencies?": "package[]",
					"contributors?": "contributor[]"
				},
				contributor: {
					email: "email",
					"packages?": "package[]"
				}
			})

		type Package = ReturnType<typeof getCyclicScope>["infer"]["package"]

		const getCyclicData = () => {
			const packageData = {
				name: "arktype",
				dependencies: [{ name: "typescript" }],
				contributors: [{ email: "david@arktype.io" }]
			} satisfies Package
			packageData.dependencies.push(packageData)
			return packageData
		}

		it("cyclic union", () => {
			const $ = scope({
				a: { b: "b|false" },
				b: { a: "a|true" }
			})
			attest($.infer).type.toString.snap(
				"{ a: { b: false | { a: true | any; }; }; b: { a: true | { b: false | any; }; }; }"
			)
		})

		it("cyclic intersection", () => {
			const $ = scope({
				a: { b: "b&a" },
				b: { a: "a&b" }
			})
			attest($.infer).type.toString.snap(
				"{ a: { b: { a: { b: any; a: any; }; b: any; }; }; b: { a: { b: { a: any; b: any; }; a: any; }; }; }"
			)
		})

		it("allows valid", () => {
			const types = getCyclicScope().export()
			const data = getCyclicData()
			attest(types.package(data)).snap({
				name: "arktype",
				dependencies: [{ name: "typescript" }, "(cycle)" as never],
				contributors: [{ email: "david@arktype.io" }]
			})
		})

		it("adds errors on invalid", () => {
			const types = getCyclicScope().export()
			const data = getCyclicData()
			data.contributors[0].email = "ssalbdivad"
			attest(types.package(data).toString()).snap(
				'contributors[0].email must be a valid email (was "ssalbdivad")'
			)
		})

		it("can include cyclic data in message", () => {
			const data = getCyclicData()
			const nonSelfDependent = getCyclicScope().type([
				"package",
				":",
				p => !p.dependencies?.some(d => d.name === p.name)
			])
			attest(nonSelfDependent(data).toString()).snap(
				'must be valid according to an anonymous predicate (was {"name":"arktype","dependencies":[{"name":"typescript"},"(cycle)"],"contributors":[{"email":"david@arktype.io"}]})'
			)
		})

		it("union cyclic reference", () => {
			const types = scope({
				a: {
					b: "b"
				},
				b: {
					a: "a|3"
				}
			}).export()
			attest(types.a.infer).type.toString.snap("{ b: { a: 3 | any; }")

			attest(types.a.json).snap({
				domain: "object",
				prop: [
					{
						key: "b",
						value: {
							domain: "object",
							prop: [{ key: "a", value: ["$a", { unit: 3 }] }]
						}
					}
				]
			})

			const valid: typeof types.a.infer = { b: { a: 3 } }

			attest(types.a(valid)).equals(valid)

			valid.b.a = valid

			// check cyclic
			attest(types.a(valid)).equals(valid)

			attest(types.a({ b: { a: { b: { a: 4 } } } }).toString()).snap(
				'b.a.b.a must be an object or 3 (was number, 4) or b.a must be 3 (was {"b":{"a":4}})'
			)

			attest(types.b.infer).type.toString.snap("{ a: 3 | { b: any; }; }")
			attest(types.b.json).snap({
				domain: "object",
				prop: [{ key: "a", value: ["$a", { unit: 3 }] }]
			})
		})

		it("intersect cyclic reference", () => {
			const types = scope({
				a: {
					b: "b"
				},
				b: {
					c: "a&b"
				}
			}).export()
			attest(types.a.infer).type.toString.snap()
			attest(types.b.infer).type.toString.snap()

			const expectedCyclicJson =
				types.a.raw.firstReferenceOfKindOrThrow("alias").json

			attest(types.a.json).snap({
				domain: "object",
				prop: [
					{
						key: "b",
						value: {
							domain: "object",
							prop: [
								{
									key: "c",
									value: expectedCyclicJson
								}
							]
						}
					}
				]
			})
			const a = {} as typeof types.a.infer
			const b = { c: {} } as typeof types.b.infer
			a.b = b
			b.c.b = b
			b.c.c = b.c

			attest(types.a(a)).equals(a)
			attest(types.a({ b: { c: {} } }).toString())
				.snap(`b.c.b must be { c: a&b } (was missing)
b.c.c must be a&b (was missing)`)

			attest(types.b.json).snap({
				domain: "object",
				prop: [
					{
						key: "c",
						value: expectedCyclicJson
					}
				]
			})
		})
	})
})
