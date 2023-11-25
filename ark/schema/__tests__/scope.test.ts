import { attest } from "@arktype/attest"
import { SchemaScope } from "../scope.js"

describe("SchemaScope", () => {
	it("parse", () => {
		const $ = SchemaScope.from({
			number: ["number", "string"],
			ordered: {
				ordered: true,
				branches: ["string"]
			}
		})
		attest($)
	})
})
