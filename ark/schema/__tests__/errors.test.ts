import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("intersections", () => {
	it("compiles errors", () => {
		const n = schema({
			basis: "number",
			divisor: 3,
			min: 5
		})
		attest(n.apply(6)).snap({ out: 6 })
		attest(n.apply(7).errors?.summary).snap("Must be a multiple of 3 (was 7)")
	})
	it("compiles path errors", () => {
		const o = schema({
			basis: "object",
			required: {
				key: "foo",
				value: {
					basis: "number",
					divisor: 3,
					min: 5
				}
			}
		})
		attest(o.apply({ foo: 6 })).snap({ out: { foo: 6 } })
		attest(o.apply({ foo: 7 }).errors?.summary).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})
})
