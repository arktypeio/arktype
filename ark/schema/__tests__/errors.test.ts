import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("errors", () => {
	it("shallow", () => {
		const n = schema({
			basis: "number",
			divisor: 3
		})
		attest(n.apply(6)).snap({ out: 6 })
		attest(n.apply(7).errors?.summary).snap("Must be a multiple of 3 (was 7)")
	})
	it("at path", () => {
		const o = schema({
			basis: "object",
			required: {
				key: "foo",
				value: {
					basis: "number",
					divisor: 3
				}
			}
		})
		attest(o.apply({ foo: 6 })).snap({ out: { foo: 6 } })
		attest(o.apply({ foo: 7 }).errors?.summary).snap(
			"foo must be a multiple of 3 (was 7)"
		)
	})
	it("uses node description by default", () => {
		const s = schema({
			domain: "string",
			description: "my special string"
		})
		attest(s.description).snap("my special string")
		attest(s.apply(5).errors?.summary).snap("Must be a string (was number)")
	})
})
