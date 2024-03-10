import { attest } from "@arktype/attest"
import { scopeNode } from "../../scope.js"

describe("scope", () => {
	it("parse", () => {
		const $ = scopeNode({
			numberOrString: ["number", "string"]
		})
		attest($.resolutions.numberOrString.allows(5)).equals(true)
		attest($.resolutions.numberOrString.allows("foo")).equals(true)
		attest($.resolutions.numberOrString.allows(null)).equals(false)
	})
})
