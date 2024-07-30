import { attest, contextualize } from "@ark/attest"
import { schema, writeOrderedIntersectionMessage } from "@ark/schema"

contextualize(() => {
	it("binary", () => {
		const l = schema([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const r = schema({
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
		const n = schema(["number", {}, { unit: 5 }])
		attest(n.json).snap({})
	})

	it("union of all types reduced to unknown", () => {
		const n = schema([
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
		const l = schema(["number", "string"])
		const r = schema(["string", "number"])
		attest(l.json).equals(r.json)
	})

	it("doesn't normalize ordered unions", () => {
		const l = schema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = schema({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})

	it("reducible intersection with union", () => {
		const l = schema({
			domain: "string",
			minLength: 1
		})
		const r = schema(["string", Array])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("unordered union with ordered union", () => {
		const l = schema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = schema(["number", "string"])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("intersection of ordered unions", () => {
		const l = schema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = schema({
			branches: ["number", "string"],
			ordered: true
		})

		attest(() => l.and(r)).throws(
			writeOrderedIntersectionMessage("string | number", "number | string")
		)
	})
})
