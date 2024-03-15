import { attest } from "@arktype/attest"
import { node } from "../../keywords/ark.js"

describe("props", () => {
	it("normalizes prop order", () => {
		const l = node({
			domain: "object",
			required: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = node({
			domain: "object",
			required: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.innerId).equals(r.innerId)
	})
})
