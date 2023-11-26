import { attest } from "@arktype/attest"
import { Space } from "../space.js"

describe("SchemaScope", () => {
	it("parse", () => {
		const $ = Space.from({
			number: ["number", "string"],
			ordered: {
				ordered: true,
				branches: ["string"]
			}
		})
		attest($)
	})
})
