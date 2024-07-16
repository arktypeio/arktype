import { attest, contextualize } from "@ark/attest"
import {
	schema,
	writeUnboundableMessage,
	writeUnresolvableMessage,
	type distillOut,
	type string
} from "@ark/schema"
import { define, scope, type } from "arktype"
import type { Module } from "../module.js"
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
		attest<any>($.resolve("a").infer)
		attest<[number, any]>($.type(["number", "a"]).infer)
	})

	it("infers input and output", () => {
		const $ = scope({
			a: ["string", "=>", s => s.length]
		})
		attest<number>($.resolve("a").infer)

		attest<string>($.resolve("a").in.infer)
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
		}).throwsAndHasTypeError(writeUnboundableMessage("boolean"))
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
				baz: "foo"
			}).export()
		}).completions({ foo: ["foobar"] })
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
			attest({} as typeof types.a.infer).type.toString.snap(
				"{ b: { a: ...; }; }"
			)
			attest({} as typeof types.b.infer.a.b.a.b.a.b.a).type.toString.snap(
				"{ b: { a: ...; }; }"
			)

			// @ts-expect-error
			attest({} as typeof types.a.infer.b.a.b.c).type.errors.snap(
				"Property 'c' does not exist on type '{ a: { b: ...; }; }'."
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

		type Package = distillOut<ReturnType<typeof getCyclicScope>["t"]["package"]>

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
			const types = scope({
				a: { b: "b|false" },
				b: { a: "a|true" }
			}).export()
			attest(types).type.toString.snap(
				"Module<{ a: { b: false | { a: true | ...; }; }; b: { a: true | { b: false | ...; }; }; }>"
			)
		})

		it("cyclic intersection", () => {
			const types = scope({
				a: { b: "b&a" },
				b: { a: "a&b" }
			}).export()
			attest(types).type.toString.snap(
				"Module<{ a: { b: { a: { b: ...; a: ...; }; b: ...; }; }; b: { a: { b: { a: ...; b: ...; }; a: ...; }; }; }>"
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
			// ideally would only include one error, see:
			// https://github.com/arktypeio/arktype/issues/924
			attest(types.package(data).toString())
				.snap(`contributors[0].email must be a valid email (was "ssalbdivad")
dependencies[1].contributors[0].email must be a valid email (was "ssalbdivad")`)
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
			attest(types.a.infer).type.toString.snap("{ b: { a: 3 | ...; }; }")

			attest(types.a.json).snap({
				domain: "object",
				required: [
					{
						key: "b",
						value: {
							domain: "object",
							required: [{ key: "a", value: ["$a", { unit: 3 }] }]
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
				'b.a.b.a must be an object or 3 (was 4) or b.a must be 3 (was {"b":{"a":4}})'
			)

			attest(types.b.infer).type.toString.snap("{ a: 3 | { b: ...; }; }")
			attest(types.b.json).snap({
				domain: "object",
				required: [{ key: "a", value: ["$a", { unit: 3 }] }]
			})
		})

		it("intersect cyclic reference", () => {
			const types = scope({
				arf: {
					b: "bork"
				},
				bork: {
					c: "arf&bork"
				}
			}).export()
			attest(types.arf.infer).type.toString.snap(
				"{ b: { c: { b: ...; c: ...; }; }; }"
			)
			attest(types.bork.infer).type.toString.snap("{ c: { b: ...; c: ...; }; }")

			const expectedCyclicJson =
				types.arf.internal.firstReferenceOfKindOrThrow("alias").json

			attest(types.arf.json).snap({
				domain: "object",
				required: [
					{
						key: "b",
						value: {
							domain: "object",
							required: [
								{
									key: "c",
									value: expectedCyclicJson
								}
							]
						}
					}
				]
			})
			const a = {} as typeof types.arf.infer
			const b = { c: {} } as typeof types.bork.infer
			a.b = b
			b.c.b = b
			b.c.c = b.c

			attest(types.arf.description).snap("{ b: { c: arf&bork } }")
			attest(types.bork.description).snap("{ c: arf&bork }")

			attest(types.arf(a)).equals(a)
			attest(types.arf({ b: { c: {} } }).toString())
				.snap(`b.c.b must be an object (was missing)
b.c.c must be an object (was missing)`)

			attest(types.bork.json).snap({
				domain: "object",
				required: [
					{
						key: "c",
						value: expectedCyclicJson
					}
				]
			})
		})

		// 		// https://github.com/arktypeio/arktype/issues/930
		// 		it("intersect cyclic reference with repeat name", () => {
		// 			const types = scope({
		// 				arf: {
		// 					a: "bork"
		// 				},
		// 				bork: {
		// 					b: "arf&bork"
		// 				}
		// 			}).export()

		// 			const resolveRef: string = (
		// 				types.bork.raw.firstReferenceOfKindOrThrow("alias").json as any
		// 			).resolve

		// 			attest(types.bork.json).snap({
		// 				required: [
		// 					{ key: "b", value: { resolve: resolveRef, alias: "$arf&bork" } }
		// 				],
		// 				domain: "object"
		// 			})

		// 			attest(types.arf.json).snap({
		// 				required: [
		// 					{
		// 						key: "a",
		// 						value: types.bork.json
		// 					}
		// 				],
		// 				domain: "object"
		// 			})

		// 			attest(types.arf({ a: { b: {} } }).toString())
		// 				.snap(`a.b.a must be { b: arf&bork } (was missing)
		// a.b.b must be arf&bork (was missing)`)
		// 		})
	})

	it("can override ambient aliases", () => {
		const types = scope({
			foo: {
				bar: "string"
			},
			string: schema({ domain: "string" }).constrain("minLength", 1)
		}).export()
		attest<
			Module<{
				string: string.atLeastLength<1>
				foo: {
					bar: string.atLeastLength<1>
				}
			}>
		>(types)
		attest(types.foo.json).snap({
			required: [{ key: "bar", value: { domain: "string", minLength: 1 } }],
			domain: "object"
		})
	})
})
