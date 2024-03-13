import { attest } from "@arktype/attest"
import { schema } from "arktype"

describe("props", () => {
	it("normalizes prop order", () => {
		const l = schema({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.innerId).equals(r.innerId)
	})
})
