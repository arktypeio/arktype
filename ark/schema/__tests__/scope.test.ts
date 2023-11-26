import { attest } from "@arktype/attest"
import { NodeScope } from "../nodescope.js"

describe("SchemaScope", () => {
	it("parse", () => {
		const $ = NodeScope.from({
			number: ["number", "string"],
			ordered: {
				ordered: true,
				branches: ["string"]
			}
		})
		attest($)
	})
})
