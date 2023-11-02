import { attest } from "@arktype/attest"
import { type IntersectionNode, node, type Root } from "@arktype/schema"
import { describe, test } from "mocha"

describe("intersections", () => {
	test("root type assignment", () => {
		const t = node({ basis: "string", pattern: "/.*/" })
		attest(t).typed as IntersectionNode<string>
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
})
