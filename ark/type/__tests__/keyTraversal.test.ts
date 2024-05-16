import { attest, contextualize } from "@arktype/attest"
import { type } from "arktype"

contextualize(() => {
	const getExtraneousB = () => ({ a: "ok", b: "why?" })

	it("loose by default", () => {
		const t = type({
			a: "string"
		})

		attest(t).equals(t.onUndeclaredKey("ignore"))

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

	it("delete array key", () => {
		const o = type({ "+": "delete", a: "email[]" })
		attest(o({ a: ["shawn@arktype.io"] })).snap({
			a: ["shawn@arktype.io"]
		})
		attest(o({ a: ["notAnEmail"] }).toString()).snap(
			"a/0 must be a valid email (was 'notAnEmail')"
		)
		// can handle missing keys
		attest(o({ b: ["shawn"] }).toString()).snap("a must be defined")
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
			'a must be a string or b must be defined (was {"a":2})'
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
		attest(o({ a: [2] }).toString()).snap("a/0 must be a string (was number)")
		attest(o({ b: ["shawn"] }).toString()).snap(
			"b must be removed\na must be defined"
		)
	})

	it("reject key from union", () => {
		const o = type([{ a: "string" }, "|", { b: "boolean" }]).onUndeclaredKey(
			"reject"
		)
		attest(o({ a: 2, b: true }).toString()).snap(
			"a must be a string or removed (was number)"
		)
	})
})
