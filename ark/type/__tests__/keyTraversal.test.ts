import { attest } from "@arktype/attest"
import { type } from "arktype"

describe("key traversal", () => {
	const getExtraneousB = () => ({ a: "ok", b: "why?" })
	it("loose by default", () => {
		const t = type({
			a: "string"
		})
		const dataWithExtraneousB = getExtraneousB()
		attest(t(dataWithExtraneousB).out).equals(dataWithExtraneousB)
	})
	it("invalid union", () => {
		const o = type([{ a: "string" }, "|", { b: "boolean" }]).configure({
			keys: "strict"
		})
		attest(o({ a: 2 }).errors?.summary).snap(
			'a must be a string or removed (was {"a":2})'
		)
	})
	it("distilled type", () => {
		const t = type({
			a: "string"
		}).configure({ keys: "distilled" })
		attest(t({ a: "ok" }).out).equals({ a: "ok" })
		attest(t(getExtraneousB()).out).snap({ a: "ok" })
	})
	it("distilled array", () => {
		const o = type({ a: "email[]" }).configure({
			keys: "distilled"
		})
		attest(o({ a: ["shawn@arktype.io"] }).out).snap({
			a: ["shawn@arktype.io"]
		})
		attest(o({ a: ["notAnEmail"] }).errors?.summary).snap(
			"a/0 must be a valid email (was 'notAnEmail')"
		)
		// can handle missing keys
		attest(o({ b: ["shawn"] }).errors?.summary).snap("a must be defined")
	})
	it("distilled union", () => {
		const o = type([{ a: "string" }, "|", { b: "boolean" }]).configure({
			keys: "distilled"
		})
		// can distill to first branch
		attest(o({ a: "to", z: "bra" }).out).snap({ a: "to" })
		// can distill to second branch
		attest(o({ b: true, c: false }).out).snap({ b: true })
		// can handle missing keys
		attest(o({ a: 2 }).errors?.summary).snap(
			'a must be a string or b must be defined (was {"a":2})'
		)
	})
	it("strict type", () => {
		const t = type({
			a: "string"
		}).configure({ keys: "strict" })
		attest(t({ a: "ok" }).out).equals({ a: "ok" })
		attest(t(getExtraneousB()).errors?.summary).snap("b must be removed")
	})
	it("strict array", () => {
		const o = type({ a: "string[]" }).configure({
			keys: "strict"
		})
		attest(o({ a: ["shawn"] }).out).snap({ a: ["shawn"] })
		attest(o({ a: [2] }).errors?.summary).snap(
			"a/0 must be a string (was number)"
		)
		attest(o({ b: ["shawn"] }).errors?.summary).snap(
			"b must be removed\na must be defined"
		)
	})
})
