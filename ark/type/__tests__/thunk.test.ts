import { attest, contextualize } from "@ark/attest"
import {
	toJson,
	writeShallowCycleErrorMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { scope, type, type Brand, type Scope, type Type } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"
import { writeBadDefinitionTypeMessage } from "arktype/internal/parser/definition.ts"

contextualize(() => {
	it("in type", () => {
		const T = type(() => type("boolean"))
		attest<boolean>(T.infer)
		attest(() => {
			// @ts-expect-error
			type(() => type("moolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
	})

	it("in scope", () => {
		const $ = scope({
			a: () => $.type({ b: "b" }),
			b: () => $.type({ a: "string" })
		})
		attest<{
			a: {
				b: {
					a: string
				}
			}
			b: {
				a: string
			}
		}>($["t"])

		const types = $.export()
		attest<{
			b: {
				a: string
			}
		}>(types.a.infer)

		attest(toJson(types.a)).snap({
			required: [
				{
					key: "b",
					value: { required: [{ key: "a", value: "string" }], domain: "object" }
				}
			],
			domain: "object"
		})
		attest<{ a: string }>(types.b.infer)

		attest(toJson(types.b)).snap({
			required: [{ key: "a", value: "string" }],
			domain: "object"
		})
	})

	it("expression from thunk", () => {
		const $ = scope({
			a: () => $.type({ a: "string" }),
			b: { b: "boolean" },
			aAndB: () => $.type("a&b")
		})
		const types = $.export()
		attest<{ a: string; b: boolean }>(types.aAndB.infer)
		attest(toJson(types.aAndB)).snap({
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: [{ unit: false }, { unit: true }] }
			],
			domain: "object"
		})
	})

	it("shallow in type", () => {
		const T = type(() => type("string"))
		attest(toJson(T)).equals(toJson(type("string")))
		attest<string>(T.infer)
	})

	it("deep in type", () => {
		const T = type({ a: () => type("string") })
		attest(toJson(T)).equals(toJson(type({ a: "string" })))
		attest<{ a: string }>(T.infer)
	})

	it("non-type thunk in scope", () => {
		const $ = scope({
			a: () => 42
		})
		attest(() => $.export()).throws(writeBadDefinitionTypeMessage("number"))
	})

	it("parse error in thunk in scope", () => {
		const $ = scope({
			// @ts-expect-error
			a: () => $.type("bad")
		})
		attest(() => $.export()).throws(writeUnresolvableMessage("bad"))
	})

	it("self-referencing thunk in scope", () => {
		const { a } = scope({ a: () => ({ "a?": "a" }) }).export()

		attest(a.expression).snap("{ a?: $a }")
		attest(a.allows({ a: { a: {} } })).equals(true)
		attest(a.allows({ a: 1 })).equals(false)

		const $: Scope = scope({ a: () => $.type({ "a?": "a" } as never) } as never)
		const types: Record<string, Type> = $.export() as never
		attest(types.a.expression).snap("{ a?: $a }")

		const shallow: Scope = scope({
			a: () => shallow.type("a | string" as never)
		} as never)
		attest(() => shallow.export()).throws(
			writeShallowCycleErrorMessage("a", ["a"])
		)
	})

	// https://github.com/arktypeio/arktype/issues/813
	it("cyclic thunks in scope", () => {
		const $: Scope = scope({
			a: () => $.type({ b: "b" } as never),
			b: () => $.type({ a: "a" } as never)
		} as never)
		const types: Record<string, Type> = $.export() as never
		const data: Record<string, unknown> = {}
		data.b = { a: data }

		attest(types.a.expression).snap("{ b: { a: $a } }")
		attest(types.b.expression).snap("{ a: $a }")
		attest(types.a(data)).equals(data)
		attest(String(types.a({ b: { a: 5 } }))).snap(
			"b.a must be an object (was a number)"
		)
	})

	it("thunk referenced while parsing", () => {
		const $: Scope = scope({
			w: () => $.type("a | string" as never),
			a: { v: "string", "w?": "w" }
		} as never)
		const { w }: Record<string, Type> = $.export() as never
		attest(w.expression).snap("string | { v: string, w?: $w }")
		attest(String(w({ v: "x", w: { v: 1 } }))).snap(
			"w.v must be a string (was a number)"
		)

		const withDefault: Scope = scope({
			w: () => withDefault.type({ x: ["a", "=", () => ({ n: 5 })] } as never),
			a: { "n?": "a", "w?": "w" }
		} as never)
		attest(() => withDefault.export()).throws(
			"Default for x.n must be an object (was a number)"
		)

		const throwing: Scope = scope({
			w: () => throwing.type({ a: "a", b: "bad" } as never),
			a: { "w?": "w" }
		} as never)
		attest(() => throwing.type("w" as never)).throws(
			writeUnresolvableMessage("bad")
		)
		attest(() => throwing.type("a" as never)).throws(
			writeUnresolvableMessage("bad")
		)
	})

	it("docs example", () => {
		const $ = type.scope({
			id: "string#id",
			expandUserGroup: () =>
				$.type({
					name: "string",
					id: "id"
				})
					.or("id")
					.pipe(function _docsExampleThunkMorph(user) {
						return typeof user === "string" ?
								{ id: user, name: "Anonymous" }
							:	user
					})
					.array()
					.atLeastLength(2)
		})

		attest<
			Scope<{
				id: Brand<string, "id">
				expandUserGroup: ((
					In:
						| string
						| {
								name: string
								id: string
						  }
				) => Out<{
					name: string
					id: Brand<string, "id">
				}>)[]
			}>
		>($)

		const types = $.export()

		attest({
			id: toJson(types.id),
			expandUserGroup: toJson(types.expandUserGroup)
		}).snap({
			id: { domain: "string" },
			expandUserGroup: {
				sequence: {
					in: [
						"string",
						{
							required: [
								{ key: "id", value: "string" },
								{ key: "name", value: "string" }
							],
							domain: "object"
						}
					],
					morphs: ["$ark._docsExampleThunkMorph"]
				},
				proto: "Array",
				minLength: 2
			}
		})

		const groups = types.expandUserGroup([
			{ name: "Magical Crawdad", id: "777" },
			"778"
		])

		type BrandedId = typeof types.id.t

		attest(groups).snap([
			{ name: "Magical Crawdad", id: "777" as BrandedId },
			{ id: "778" as BrandedId, name: "Anonymous" }
		])
	})

	it("docs inelegant", () => {
		// you *can* use them anywhere, but *should* you? (no)
		const Inelegant = type(() =>
			type({ inelegantKey: () => type("'inelegant value'") })
		)

		attest(Inelegant.t).type.toString.snap(
			'{ inelegantKey: "inelegant value" }'
		)
		attest(Inelegant.expression).snap('{ inelegantKey: "inelegant value" }')
	})
})
