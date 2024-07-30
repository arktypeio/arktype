import { attest, contextualize } from "@ark/attest"
import { rootNode, writeOrderedIntersectionMessage } from "@ark/schema"

contextualize(() => {
	it("binary", () => {
		const l = rootNode([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const r = rootNode({
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
		const n = rootNode(["number", {}, { unit: 5 }])
		attest(n.json).snap({})
	})

	it("union of all types reduced to unknown", () => {
		const n = rootNode([
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
		const l = rootNode(["number", "string"])
		const r = rootNode(["string", "number"])
		attest(l.json).equals(r.json)
	})

	it("doesn't normalize ordered unions", () => {
		const l = rootNode({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootNode({
			branches: ["number", "string"],
			ordered: true
		})
		attest(l.equals(r)).equals(false)
	})

	it("reducible intersection with union", () => {
		const l = rootNode({
			domain: "string",
			minLength: 1
		})
		const r = rootNode(["string", Array])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("unordered union with ordered union", () => {
		const l = rootNode({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootNode(["number", "string"])
		const result = l.and(r)
		attest(result.json).equals(l.json)
	})

	it("intersection of ordered unions", () => {
		const l = rootNode({
			branches: ["string", "number"],
			ordered: true
		})
		const r = rootNode({
			branches: ["number", "string"],
			ordered: true
		})

		attest(() => l.and(r)).throws(
			writeOrderedIntersectionMessage("string | number", "number | string")
		)
	})
})
