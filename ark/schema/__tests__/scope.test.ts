import { attest } from "@arktype/attest"
import { ScopeNode } from "../scope.js"

describe("SchemaScope", () => {
	it("parse", () => {
		const $ = ScopeNode.from({
			number: ["number", "string"],
			ordered: {
				ordered: true,
				branches: ["string"]
			}
		})
		attest($)
	})
})
