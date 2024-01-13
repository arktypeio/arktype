import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("allows", () => {
	it("multiple constraints", () => {
		const n = schema({
			basis: "number",
			divisor: 3,
			min: 5
		})
		attest(n.allows(6)).snap(true)
		attest(n.allows(4)).snap(false)
		attest(n.allows(7)).snap(false)
	})
})
