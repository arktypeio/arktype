import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("union", () => {
	it("union", () => {
		const l = schema(
			{
				basis: "number",
				divisor: 2
			},
			{
				basis: "number",
				divisor: 3
			}
		)
		const r = schema({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap([
			{ basis: "number", divisor: 10 },
			{ basis: "number", divisor: 15 }
		])
	})

	it("reduces union", () => {
		const n = schema("number", {}, { unit: 5 })
		attest(n.json).snap({})
	})
	it("union of all types reduced to unknown", () => {
		const n = schema(
			"string",
			"number",
			"object",
			"bigint",
			"symbol",
			{ unit: true },
			{ unit: false },
			{ unit: null },
			{ unit: undefined }
		)
		attest(n.json).snap({})
	})
	it("normalizes union order", () => {
		const l = schema("number", "string")
		const r = schema("string", "number")
		attest(l.innerId).equals(r.innerId)
	})
	it("doesn't normalize ordered unions", () => {
		const l = schema.union({
			branches: ["string", "number"],
			ordered: true
		})
		const r = schema.union({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})
})
