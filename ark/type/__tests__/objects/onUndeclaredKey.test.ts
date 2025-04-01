import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeInvalidUndeclaredBehaviorMessage } from "arktype/internal/parser/objectLiteral.ts"

contextualize(() => {
	it("can parse an undeclared restriction", () => {
		const T = type({ "+": "reject" })
		attest<{}>(T.infer)
		attest(T.json).snap({ undeclared: "reject", domain: "object" })
	})

	it("fails on type definition for undeclared", () => {
		// @ts-expect-error
		attest(() => type({ "+": "string" }))
			.throws(writeInvalidUndeclaredBehaviorMessage("string"))
			.type.errors.snap(
				"Type '\"string\"' is not assignable to type 'UndeclaredKeyBehavior'."
			)
	})

	it("can escape undeclared meta key", () => {
		const T = type({ "\\+": "string" })
		attest<{ "+": string }>(T.infer)
		attest(T.json).snap({
			required: [{ key: "+", value: "string" }],
			domain: "object"
		})
	})

	describe("traversal", () => {
		const getExtraneousB = () => ({ a: "ok", b: "why?" })

		it("loose by default", () => {
			const T = type({
				a: "string"
			})

			attest(T.json).equals(T.onUndeclaredKey("ignore").json)

			const dataWithExtraneousB = getExtraneousB()
			attest(T(dataWithExtraneousB)).equals(dataWithExtraneousB)
		})

		it("delete keys", () => {
			const T = type({
				a: "string"
			}).onUndeclaredKey("delete")
			attest(T({ a: "ok" })).equals({ a: "ok" })
			attest(T(getExtraneousB())).snap({ a: "ok" })
		})

		it("applies shallowly", () => {
			const T = type({
				a: "string",
				nested: {
					a: "string"
				}
			}).onUndeclaredKey("delete")

			attest(
				T({
					...getExtraneousB(),
					nested: getExtraneousB()
				})
			).equals({ a: "ok", nested: { a: "ok", b: "why?" } as never })
		})

		it("can apply deeply", () => {
			const T = type({
				a: "string",
				nested: {
					a: "string"
				}
			}).onDeepUndeclaredKey("delete")

			attest(T.expression).snap(
				"{ a: string, nested: { a: string, + (undeclared): delete }, + (undeclared): delete }"
			)

			attest(
				T({
					...getExtraneousB(),
					nested: getExtraneousB()
				})
			).equals({ a: "ok", nested: { a: "ok" } })
		})

		it("delete union key", () => {
			const O = type([
				{ a: "string" },
				"|",
				{ a: "boolean", b: "true" }
			]).onUndeclaredKey("delete")
			// can distill to first branch
			attest(O({ a: "to", z: "bra" })).snap({ a: "to" })
			// can distill to second branch
			attest(O({ a: true, b: true, c: false })).snap({ a: true, b: true })
			// can handle missing keys
			attest(O({ a: true }).toString()).snap(
				"a must be a string (was boolean) or b must be true (was missing)"
			)
		})

		it("fails on delete indiscriminable union key", () => {
			attest(() =>
				type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey("delete")
			).throws
				.snap(`ParseError: An unordered union of a type including a morph and a type with overlapping input is indeterminate:
Left: { a: string, + (undeclared): delete }
Right: { b: boolean, + (undeclared): delete }`)
		})

		it("reject key", () => {
			const T = type({
				a: "string"
			}).onUndeclaredKey("reject")
			attest(T({ a: "ok" })).equals({ a: "ok" })
			attest(T(getExtraneousB()).toString()).snap("b must be removed")
		})

		it("reject array key", () => {
			const O = type({ "+": "reject", a: "string[]" })
			attest(O({ a: ["shawn"] })).snap({ a: ["shawn"] })
			attest(O({ a: [2] }).toString()).snap(
				"a[0] must be a string (was a number)"
			)
			attest(O({ b: ["shawn"] }).toString())
				.snap(`a must be an array (was missing)
b must be removed`)
		})

		it("reject key from union", () => {
			const O = type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey(
				"reject"
			)
			attest(O({ a: 2, b: true }).toString()).snap(
				"a must be a string or removed (was 2)"
			)
		})
	})
})
