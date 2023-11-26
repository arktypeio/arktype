import { attest } from "@arktype/attest"
import { space } from "../space.js"

describe("SchemaScope", () => {
	it("parse", () => {
		const $ = space({
			number: ["number", "string"],
			ordered: {
				ordered: true,
				branches: ["string"]
			}
		})
		attest($)
	})
})
