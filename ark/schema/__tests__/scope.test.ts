import { attest } from "@arktype/attest"
import { scopeNode } from "../scope.js"

describe("scope", () => {
	it("parse", () => {
		const $ = scopeNode({
			numberOrString: ["number", "string"]
		})
		attest($.resolutions.numberOrString.traverse(5)).equals(true)
		attest($.resolutions.numberOrString.traverse("foo")).equals(true)
		attest($.resolutions.numberOrString.traverse(null)).equals(false)
	})
})
