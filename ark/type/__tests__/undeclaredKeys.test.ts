import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"

contextualize(() => {
	describe("traversal", () => {
		const getExtraneousB = () => ({ a: "ok", b: "why?" })

		it("loose by default", () => {
			const t = type({
				a: "string"
			})

			attest(t.json).equals(t.onUndeclaredKey("ignore").json)

			const dataWithExtraneousB = getExtraneousB()
			attest(t(dataWithExtraneousB)).equals(dataWithExtraneousB)
		})

		it("delete keys", () => {
			const t = type({
				a: "string"
			}).onUndeclaredKey("delete")
			attest(t({ a: "ok" })).equals({ a: "ok" })
			attest(t(getExtraneousB())).snap({ a: "ok" })
		})

		it("delete union key", () => {
			const o = type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey(
				"delete"
			)
			// can distill to first branch
			attest(o({ a: "to", z: "bra" })).snap({ a: "to" })
			// can distill to second branch
			attest(o({ b: true, c: false })).snap({ b: true })
			// can handle missing keys
			attest(o({ a: 2 }).toString()).snap(
				"a must be a string (was number) or b must be boolean (was missing)"
			)
		})

		it("reject key", () => {
			const t = type({
				a: "string"
			}).onUndeclaredKey("reject")
			attest(t({ a: "ok" })).equals({ a: "ok" })
			attest(t(getExtraneousB()).toString()).snap("b must be removed")
		})

		it("reject array key", () => {
			const o = type({ "+": "reject", a: "string[]" })
			attest(o({ a: ["shawn"] })).snap({ a: ["shawn"] })
			attest(o({ a: [2] }).toString()).snap(
				"a[0] must be a string (was number)"
			)
			attest(o({ b: ["shawn"] }).toString())
				.snap(`a must be an array (was missing)
		b must be removed`)
		})

		it("reject key from union", () => {
			const o = type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey(
				"reject"
			)
			attest(o({ a: 2, b: true }).toString()).snap(
				"a must be a string or removed (was 2)"
			)
		})
	})
})
