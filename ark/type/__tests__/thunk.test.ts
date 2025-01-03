import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import type { Brand } from "@ark/util"
import { scope, type, type Scope } from "arktype"
import type { Out } from "arktype/internal/attributes.ts"
import { writeBadDefinitionTypeMessage } from "arktype/internal/parser/definition.ts"

contextualize(() => {
	it("in type", () => {
		const t = type(() => type("boolean"))
		attest<boolean>(t.infer)
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

		attest(types.a.json).snap({
			required: [
				{
					key: "b",
					value: { required: [{ key: "a", value: "string" }], domain: "object" }
				}
			],
			domain: "object"
		})
		attest<{ a: string }>(types.b.infer)

		attest(types.b.json).snap({
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
		attest(types.aAndB.json).snap({
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: [{ unit: false }, { unit: true }] }
			],
			domain: "object"
		})
	})

	it("shallow in type", () => {
		const t = type(() => type("string"))
		attest(t.json).equals(type("string").json)
		attest<string>(t.infer)
	})

	it("deep in type", () => {
		const t = type({ a: () => type("string") })
		attest(t.json).equals(type({ a: "string" }).json)
		attest<{ a: string }>(t.infer)
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

	it("docs example", () => {
		const $ = type.scope({
			id: "string#id",
			expandUserGroup: () =>
				$.type({
					name: "string",
					id: "id"
				})
					.or("id")
					.pipe(user =>
						typeof user === "string" ? { id: user, name: "Anonymous" } : user
					)
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

		const flattenUserMorphs =
			types.expandUserGroup.internal.firstReferenceOfKindOrThrow(
				"morph"
			).serializedMorphs

		attest($.json).snap({
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
					morphs: flattenUserMorphs
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
		const myInelegantType = type(() =>
			type({ inelegantKey: () => type("'inelegant value'") })
		)

		attest(myInelegantType.t).type.toString.snap()
		attest(myInelegantType.expression).snap(
			'{ inelegantKey: "inelegant value" }'
		)
	})
})
