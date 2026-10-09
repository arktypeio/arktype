import { attest, contextualize } from "@ark/attest"
import { registeredReference, writeUnresolvableMessage } from "@ark/schema"
import { type, type Type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"

contextualize(() => {
	it("empty", () => {
		const O = type({})
		attest<object>(O.t).type.toString("object")
		attest(O.json).equals(type("object").json)
	})

	it("required", () => {
		const O = type({ a: "string", b: "number" })
		attest<{ a: string; b: number }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
	})

	it("optional keys", () => {
		const O = type({ "a?": "string", b: "number" })
		attest<{ a?: string; b: number }>(O.infer)
		attest(O.json).snap({
			domain: "object",
			required: [{ key: "b", value: "number" }],
			optional: [{ key: "a", value: "string" }]
		})
	})

	it("chained optional", () => {
		const OptionalString = type("string").optional()
		attest<[Type<string>, "?"]>(OptionalString)

		const O = type({ a: OptionalString })
		// directly inferring the optional key causes recursive generics/intersections to fail,
		// so instead we just distill it out like defaults
		attest(O.t).type.toString.snap("{ a?: string }")
		attest(O.infer).type.toString.snap("{ a?: string }")
		attest(O.inferIn).type.toString.snap("{ a?: string }")
		attest(O.json).snap({
			optional: [
				{
					key: "a",
					value: "string"
				}
			],
			domain: "object"
		})
	})

	it("string-embedded value optional", () => {
		const s = Symbol("ok")
		const ref = registeredReference(s)
		const T = type({ [s]: "string?" })

		attest<{
			[s]?: string
		}>(T.t)
		attest<{ [s]?: string }>(T.infer)

		attest(T.json).equals({
			optional: [
				{
					key: ref,
					value: "string"
				}
			],
			domain: "object"
		})
	})

	it("tuple value optional", () => {
		const s = Symbol("ok")
		const ref = registeredReference(s)
		const T = type({ [s]: [{ foo: "string" }, "?"] })

		attest<{ [s]?: { foo: string } }>(T.infer)

		attest(T.json).snap({
			optional: [
				{
					key: ref,
					value: {
						required: [{ key: "foo", value: "string" }],
						domain: "object"
					}
				}
			],
			domain: "object"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1102
	it("only optional keys not reduced to object", () => {
		const O = type({ "a?": "number" })

		const U = type({ b: O })
		attest(U.expression).snap("{ b: { a?: number } }")
		attest<{
			b: {
				a?: number
			}
		}>(U.t)
		attest<typeof U.t>(U.infer)
		attest<typeof U.t>(U.inferIn)
	})

	// https://github.com/arktypeio/arktype/issues/1102
	it("optional keys in union not reduced to object", () => {
		const U = type({ b: type({ "a?": "number" }).or("number") })
		attest(U.expression).snap("{ b: number | { a?: number } }")
		attest<{
			b:
				| {
						a?: number
				  }
				| number
		}>(U.t)
	})

	it("symbol key", () => {
		const s = Symbol()
		const name = registeredReference(s)
		const T = type({
			[s]: "string"
		})
		attest<{ [s]: string }>(T.infer)
		attest(T.json).snap({
			domain: "object",
			required: [{ key: name, value: "string" }]
		})
	})

	it("serializes to same value but not reference equal", () => {
		const T = type("===", {})
		attest(T({}).toString()).snap(
			"must be reference equal to {} (serialized to the same value)"
		)
	})

	it("error in obj that has tuple that writes error at proper path", () => {
		attest(() =>
			// @ts-expect-error
			type({ "a?": ["string", ["stringx", "?"]] })
		).throwsAndHasTypeError(writeUnresolvableMessage("stringx"))
	})

	it("nested", () => {
		const T = type({ "a?": { b: "boolean" } })
		attest<{ a?: { b: boolean } }>(T.infer)
	})

	it("intersections", () => {
		const a = { "a?": "string" } as const
		const b = { b: "string" } as const
		const c = { "c?": "string" } as const
		const Abc = type(a).and(b).and(c)
		attest<{ a?: string; b: string; c?: string }>(Abc.infer)
		attest(Abc.json).equals(type({ ...a, ...b, ...c }).json)
		attest(Abc.json).equals(type([[a, "&", b], "&", c]).json)
	})

	it("intersection", () => {
		const T = type({ a: "number" }).and({ b: "boolean" })
		// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
		attest(T.infer).type.toString.snap("{ a: number; b: boolean }")
		attest(T.json).equals(type({ a: "number", b: "boolean" }).json)
	})

	it("escaped optional token", () => {
		const T = type({ "a\\?": "string" })
		attest<{ "a?": string }>(T.infer)
		attest(T.json).snap({
			required: [{ key: "a?", value: "string" }],
			domain: "object"
		})
	})

	it("traverse optional", () => {
		const O = type({ "a?": "string" })
		attest(O({ a: "a" })).snap({ a: "a" })
		attest(O({})).snap({})
		attest(O({ a: 1 }).toString()).snap("a must be a string (was a number)")
	})

	it("optional symbol", () => {
		const s = Symbol()
		const keyReference = registeredReference(s)
		const T = type({
			[s]: type.number.optional()
		})
		attest<{ [s]?: number }>(T.infer)
		attest(T.json).equals({
			optional: [
				{
					key: keyReference,
					value: "number"
				}
			],
			domain: "object"
		})
	})

	it("morphed", () => {
		const ProcessForm = type({
			bool_value: type("string")
				.pipe(v => (v === "on" ? true : false))
				.optional()
		})

		attest<{
			bool_value?: (In: string) => Out<boolean>
		}>(ProcessForm.t)
		attest<{
			// key should still be distilled as optional even inside a morph
			bool_value?: string
		}>(ProcessForm.inferIn)
		attest<{
			// out should also be inferred as optional
			bool_value?: boolean
		}>(ProcessForm.infer)

		attest(ProcessForm({})).snap({})

		attest(ProcessForm({ bool_value: "on" })).snap({ bool_value: true })

		attest(ProcessForm({ bool_value: true }).toString()).snap(
			"bool_value must be a string (was boolean)"
		)
	})

	it("required key homomorphic", () => {
		const T = type({
			/** FOO */
			foo: "string"
		})

		const out = T.assert({ foo: "foo" })

		attest(out.foo).jsdoc.snap("FOO")
	})

	it("optional value homomorphic", () => {
		const T = type({
			/** BAR */
			bar: "number?"
		})

		const out = T.assert({})

		attest(out.bar).jsdoc.snap("BAR")
	})
})
