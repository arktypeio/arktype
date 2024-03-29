import { attest } from "@arktype/attest"
import { root, validation } from "@arktype/schema"

describe("union", () => {
	it("union", () => {
		const l = root([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const r = root({
			domain: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap([
			{ domain: "number", divisor: 10 },
			{ domain: "number", divisor: 15 }
		])
	})

	it("reduces union", () => {
		const n = root(["number", {}, { unit: 5 }])
		attest(n.json).snap({})
	})
	it("union of all types reduced to unknown", () => {
		const n = root([
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		])
		attest(n.json).snap({})
	})
	it("normalizes union order", () => {
		const l = root(["number", "string"])
		const r = root(["string", "number"])
		attest(l.innerId).equals(r.innerId)
	})
	it("doesn't normalize ordered unions", () => {
		const l = root({
			branches: ["string", "number"],
			ordered: true
		})
		const r = root({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})

	it("reducible intersection with union", () => {
		const l = validation.email
		const r = root(["string", Array])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})
})
