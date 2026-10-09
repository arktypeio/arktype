import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"
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

	it("merges a narrowed index signature with a declared key", () => {
		const L = type({ a: "number", "[string]": "number" })
		const R = type({ a: "number", b: "number", "+": "reject" })
		attest(L.and(R).expression).snap(
			"{ a: number, b: number, + (undeclared): reject }"
		)
		attest(R.and(L).expression).equals(L.and(R).expression)
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

		it("delete keys keeping a prototype", () => {
			class Tagged {
				tag = "a"
				extra = 1
			}
			const T = type({ "+": "delete", tag: "string" })

			const tagged = T.assert(new Tagged())
			attest(tagged instanceof Tagged).equals(true)
			attest({ ...tagged }).snap({ tag: "a" })

			const nullProto = T.assert(
				Object.assign(Object.create(null), { tag: "a", extra: 1 })
			)
			attest(Object.getPrototypeOf(nullProto)).equals(null)
			attest({ ...nullProto }).snap({ tag: "a" })
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

		it("reject symbol key", () => {
			const undeclared = Symbol("undeclared")
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type({ "+": "reject", a: "string" })
				attest(T({ a: "ok", [undeclared]: 1 }).toString()).snap(
					"value at [Symbol(undeclared)] must be removed"
				)
			}
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

		it("doesn't declare keys Object.prototype has", () => {
			const Deleted = type({ "+": "delete", a: "string", "b?": "number" })
			attest(Deleted({ a: "x", toString: 1, constructor: 2, z: 3 })).snap({
				a: "x"
			})

			const Rejected = type({ "+": "reject", a: "string" })
			attest(Rejected({ a: "x", toString: 1 }).toString()).snap(
				"toString must be removed"
			)
		})

		it("declares a __proto__ key", () => {
			const T = type({ ["__proto__"]: "string", "+": "reject" })
			const data = JSON.parse('{"__proto__":"x"}')
			attest(T(data)).equals(data)
			attest(T.get("__proto__").expression).snap("string")
			attest(T.or({ k: "1", "+": "reject" }).expression).snap(
				"{ __proto__: string, + (undeclared): reject } | { k: 1, + (undeclared): reject }"
			)
		})

		it("delete keeps declared __proto__", () => {
			for (const jitless of [false, true]) {
				const T = scope({}, { jitless }).type({
					["__proto__?"]: "object",
					"+": "delete"
				})
				const out = T.assert(JSON.parse('{"__proto__":{"x":1},"z":2}'))
				attest(Object.keys(out)).equals(["__proto__"])
				attest(Object.getPrototypeOf(out) === Object.prototype).equals(true)
			}
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
