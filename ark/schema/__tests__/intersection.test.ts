import { attest } from "@arktype/attest"
import { type BaseNode, node, type Root } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"

describe("intersections", () => {
	it("root type assignment", () => {
		const t = node({ basis: "string", pattern: "/.*/" })
		attest<BaseNode<"intersection", string>>(t)
		attest(t.json).snap({
			intersection: [{ domain: "string" }, { pattern: ".*", flags: "" }]
		})
		// previously had issues with a union complexity error when assigning to Root | undefined
		const root: Root | undefined = node({ basis: "string", pattern: "/.*/" })
	})
	it("multiple rules", () => {
		const l = node({
			basis: "number",
			divisor: 3,
			min: 5
		})
		const r = node({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap({
			intersection: [
				{ domain: "number" },
				{ divisor: 15 },
				{ min: 5, boundKind: "number" }
			]
		})
	})
	it("union", () => {
		const l = node(
			{
				basis: "number",
				divisor: 2
			},
			{
				basis: "number",
				divisor: 3
			}
		)
		const r = node({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest(result.json).snap({
			union: [
				{ intersection: [{ domain: "number" }, { divisor: 10 }] },
				{ intersection: [{ domain: "number" }, { divisor: 15 }] }
			],
			ordered: false
		})
	})
	it("in/out", () => {
		const parseNumber = node({
			in: {
				basis: "string",
				pattern: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morph: (s: string) => parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			description: "a well-formed numeric string",
			intersection: [
				{ domain: "string" },
				{ pattern: "^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$", flags: "" }
			]
		})
		attest(parseNumber.out.json).snap({ intersection: [] })
	})
	it("reduces union", () => {
		const n = node("number", {}, { unit: 5 })
		attest(n.json).snap({ intersection: [] })
	})
	it("in/out union", () => {
		const n = node(
			{
				in: "string",
				morph: (s: string) => parseFloat(s)
			},
			"number"
		)
		attest(n.in.json).snap({
			union: [{ domain: "string" }, { domain: "number" }]
		})
		attest(n.out.json).snap({ intersection: [] })
	})
})
