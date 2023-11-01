import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import { describe, test } from "mocha"

describe("intersections", () => {
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
			branches: [
				{
					domain: { domain: "number" },
					divisor: { divisor: 15 },
					min: { min: 5 }
				}
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
