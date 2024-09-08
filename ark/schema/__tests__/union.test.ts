import { attest, contextualize } from "@ark/attest"
import { rootSchema, writeOrderedIntersectionMessage } from "@ark/schema"

contextualize(() => {
	it("binary", () => {
		const l = rootSchema([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const r = rootSchema({
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
		const n = rootSchema(["number", {}, { unit: 5 }])
		attest(n.json).snap({})
	})

	it("union of all types reduced to unknown", () => {
		const n = rootSchema([
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
		const l = rootSchema(["number", "string"])
		const r = rootSchema(["string", "number"])
		attest(l.json).equals(r.json)
	})

	it("doesn't normalize ordered unions", () => {
		const l = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootSchema({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})

	it("reducible intersection with union", () => {
		const l = rootSchema({
			domain: "string",
			minLength: 1
		})
		const r = rootSchema(["string", Array])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("unordered union with ordered union", () => {
		const l = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootSchema(["number", "string"])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("intersection of ordered unions", () => {
		const l = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootSchema({
			branches: ["number", "string"],
			ordered: true
		})

		attest(() => l.and(r)).throws(
			writeOrderedIntersectionMessage("string | number", "number | string")
		)
	})
})
