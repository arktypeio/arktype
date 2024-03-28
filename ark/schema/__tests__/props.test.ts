import { attest } from "@arktype/attest"
import { root } from "@arktype/schema"

describe("props", () => {
	it("normalizes prop order", () => {
		const l = root({
			domain: "object",
			prop: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = root({
			domain: "object",
			prop: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.innerId).equals(r.innerId)
	})
})
