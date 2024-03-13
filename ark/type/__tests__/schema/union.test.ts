import { attest } from "@arktype/attest"
import { keywords, node } from "../../builtins/ark.js"

describe("union", () => {
	it("union", () => {
		const l = node([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const r = node({
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
		const n = node(["number", {}, { unit: 5 }])
		attest(n.json).snap({})
	})
	it("union of all types reduced to unknown", () => {
		const n = node([
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
		const l = node(["number", "string"])
		const r = node(["string", "number"])
		attest(l.innerId).equals(r.innerId)
	})
	it("doesn't normalize ordered unions", () => {
		const l = node({
			branches: ["string", "number"],
			ordered: true
		})
		const r = node({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})

	it("reducible intersection with union", () => {
		const l = keywords.email
		const r = node(["string", Array])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})
})
