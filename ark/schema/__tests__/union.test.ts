import { attest, contextualize } from "@ark/attest"
import { Disjoint, node, rootSchema } from "@ark/schema"
import { writeOrderedIntersectionMessage } from "arksets"

contextualize(() => {
	it("binary", () => {
		const L = rootSchema([
			{
				domain: "number",
				divisor: 2
			},
			{
				domain: "number",
				divisor: 3
			}
		])
		const R = rootSchema({
			domain: "number",
			divisor: 5
		})
		const T = L.and(R)
		attest(T.json).snap([
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
		const L = rootSchema(["number", "string"])
		const R = rootSchema(["string", "number"])
		attest(L.json).equals(R.json)
	})

	it("doesn't normalize ordered unions", () => {
		const L = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const R = rootSchema({
			branches: ["number", "string"],
			ordered: true
		})
		attest(L.equals(R)).equals(false)
	})

	it("reducible intersection with union", () => {
		const L = rootSchema({
			domain: "string",
			minLength: 1
		})
		const R = rootSchema(["string", Array])
		const T = L.and(R)
		attest(T.json).equals(L.json)
	})

	it("unordered union with ordered union", () => {
		const L = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const R = rootSchema(["number", "string"])
		const T = L.and(R)
		attest(T.json).equals(L.json)
	})

	it("intersection of ordered unions", () => {
		const L = rootSchema({
			branches: ["string", "number"],
			ordered: true
		})
		const R = rootSchema({
			branches: ["number", "string"],
			ordered: true
		})

		attest(() => L.and(R)).throws(
			writeOrderedIntersectionMessage("string | number", "number | string")
		)
	})

	// https://github.com/arktypeio/arktype/issues/1645
	it("disjoints stay Disjoints when map ignores Symbol.species (Hermes)", () => {
		Object.defineProperty(Disjoint, Symbol.species, {
			get: () => Array,
			configurable: true
		})
		try {
			const d = Disjoint.init("domain", "null", "undefined")
			attest(d.withPrefixKey("a", "required") instanceof Disjoint).equals(true)
			attest(d.invert() instanceof Disjoint).equals(true)
		} finally {
			delete (Disjoint as any)[Symbol.species]
		}
	})

	it("throws a disjoint between branches on construction", () => {
		const index = rootSchema({
			domain: "object",
			index: { signature: "string", value: "string" }
		})
		const branch = (kind: string) =>
			rootSchema({
				domain: "object",
				required: [
					{ key: "kind", value: { unit: kind } },
					{ key: "x", value: "number" }
				]
			}).and(index)
		attest(() =>
			node("union", [branch("a"), branch("b")], { prereduced: true })
		).throws(
			"Intersection at x of number and string results in an unsatisfiable type"
		)
	})
})
