import { attest, contextualize } from "@ark/attest"
import { registeredReference, writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import type { string } from "arktype/internal/keywords/inference.ts"

contextualize(() => {
	it("empty", () => {
		const o = type({})
		attest<object>(o.t).type.toString("object")
		attest(o.json).equals(type("object").json)
	})

	it("required", () => {
		const o = type({ a: "string", b: "number" })
		attest<{ a: string; b: number }>(o.infer)
		attest(o.json).snap({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
	})

	it("optional keys", () => {
		const o = type({ "a?": "string", b: "number" })
		attest<{ a?: string; b: number }>(o.infer)
		attest(o.json).snap({
			domain: "object",
			required: [{ key: "b", value: "number" }],
			optional: [{ key: "a", value: "string" }]
		})
	})

	it("chained optional", () => {
		const optionalString = type("string").optional()
		attest<string.optional>(optionalString.t)
		attest<string>(optionalString.infer)

		const o = type({ a: optionalString })
		// directly inferring the optional key causes recursive generics/intersections to fail,
		// so instead we just distill it out like defaults
		attest(o.t).type.toString.snap("{ a: optional }")
		attest(o.infer).type.toString.snap("{ a?: string }")
		attest(o.inferIn).type.toString.snap("{ a?: string }")
		attest(o.json).snap({
			optional: [
				{
					key: "a",
					value: { domain: "string", meta: { optional: true } }
				}
			],
			domain: "object"
		})
	})

	it("string-embedded value optional", () => {
		const s = Symbol("ok")
		const ref = registeredReference(s)
		const t = type({ [s]: "string?" })

		attest<{
			[s]: string.optional
		}>(t.t)
		attest<{ [s]?: string }>(t.infer)

		attest(t.json).equals({
			optional: [
				{
					key: ref,
					value: { domain: "string", meta: { optional: true } }
				}
			],
			domain: "object"
		})
	})

	it("tuple value optional", () => {
		const s = Symbol("ok")
		const ref = registeredReference(s)
		const t = type({ [s]: [{ foo: "string" }, "?"] })

		attest<{ [s]?: { foo: string } }>(t.infer)

		attest(t.json).snap({
			optional: [
				{
					key: ref,
					value: {
						required: [{ key: "foo", value: "string" }],
						domain: "object",
						meta: { optional: true }
					}
				}
			],
			domain: "object"
		})
	})

	// https://github.com/arktypeio/arktype/issues/1102
	it("only optional keys not reduced to object", () => {
		const o = type({ "a?": "number" })

		const U = type({ b: o })
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
		const t = type({
			[s]: "string"
		})
		attest<{ [s]: string }>(t.infer)
		attest(t.json).snap({
			domain: "object",
			required: [{ key: name, value: "string" }]
		})
	})

	it("serializes to same value but not reference equal", () => {
		const t = type("===", {})
		attest(t({}).toString()).snap(
			"must be reference equal to {} (serialized to the same value)"
		)
	})

	it("error in obj that has tuple that writes error at proper path", () => {
		// @ts-expect-error
		attest(() => type({ "a?": ["string", ["stringx", "?"]] }))
			.throws(writeUnresolvableMessage("stringx"))
			.type.errors.snap(
				"Type '\"stringx\"' is not assignable to type '\"'stringx' is unresolvable \"'."
			)
	})

	it("nested", () => {
		const t = type({ "a?": { b: "boolean" } })
		attest<{ a?: { b: boolean } }>(t.infer)
	})

	it("intersections", () => {
		const a = { "a?": "string" } as const
		const b = { b: "string" } as const
		const c = { "c?": "string" } as const
		const abc = type(a).and(b).and(c)
		attest<{ a?: string; b: string; c?: string }>(abc.infer)
		attest(abc.json).equals(type({ ...a, ...b, ...c }).json)
		attest(abc.json).equals(type([[a, "&", b], "&", c]).json)
	})

	it("intersection", () => {
		const t = type({ a: "number" }).and({ b: "boolean" })
		// Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
		attest(t.infer).type.toString.snap("{ a: number; b: boolean }")
		attest(t.json).equals(type({ a: "number", b: "boolean" }).json)
	})

	it("escaped optional token", () => {
		const t = type({ "a\\?": "string" })
		attest<{ "a?": string }>(t.infer)
		attest(t.json).snap({
			required: [{ key: "a?", value: "string" }],
			domain: "object"
		})
	})

	it("traverse optional", () => {
		const o = type({ "a?": "string" })
		attest(o({ a: "a" })).snap({ a: "a" })
		attest(o({})).snap({})
		attest(o({ a: 1 }).toString()).snap("a must be a string (was a number)")
	})

	it("optional symbol", () => {
		const s = Symbol()
		const keyReference = registeredReference(s)
		const t = type({
			[s]: type.number.optional()
		})
		attest<{ [s]?: number }>(t.infer)
		attest(t.json).equals({
			optional: [
				{
					key: keyReference,
					value: { domain: "number", meta: { optional: true } }
				}
			],
			domain: "object"
		})
	})
})
