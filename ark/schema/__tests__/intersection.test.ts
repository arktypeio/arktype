import { attest } from "@arktype/attest"
import { type IntersectionNode, node, type Root } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"
import { describe, test } from "mocha"

describe("intersections", () => {
	test("root type assignment", () => {
		const t = node({ basis: "string", pattern: "/.*/" })
		attest<IntersectionNode<string>>(t)
		attest(t.json).snap({
			intersection: [{ domain: "string" }, { pattern: "$ark.regExp11" }]
		})
		// previously had issues with a union complexity error when assigning to Root | undefined
		const root: Root | undefined = node({ basis: "string", pattern: "/.*/" })
	})
	test("multiple rules", () => {
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
	test("union", () => {
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
			branches: [
				{ domain: { domain: "number" }, divisor: { divisor: 10 } },
				{ domain: { domain: "number" }, divisor: { divisor: 15 } }
			]
		})
	})
	test("in/out", () => {
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
})
