import { type } from "./ark/type/src/scopes/ark.js"

suite("optional tuple literals", () => {
	test("tuple with inline optional", () => {
		const t = type(["string", "number"])
		const z = type(["string?", "number"])
	})
	test("tuple with optional tuple", () => {
		const t = type([["string", "?"], "number", "string?"])
	})
	test("multidefined optional", () => {
		const t = type(["string?", "?"])
	})
})
type z = [number, string?]
test("symbol key", () => {
	const s = Symbol()
	const t = type({
		[s]: "boolean"
	})
})
test("optional symbol", () => {
	const s = Symbol()
	const t = type({
		[s]: "boolean?"
	})
})
test("optional keys and definition reduction", () => {
	const t0 = type({ "a?": "string" })
	const t1 = type({ a: "string?" })
	const t2 = type({ "a?": "string?" })
	const t3 = type({ a: ["string", "?"] })
	const t4 = type({ a: ["string?", "?"] })
	attest(t0.condition).equals(t1.condition)
	attest(t0.condition).equals(t2.condition)
	attest(t0.condition).equals(t3.condition)
	attest(t0.condition).equals(t4.condition)
})
