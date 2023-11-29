import { attest } from "@arktype/attest"
import { scopeNode } from "../scope.js"

describe("scope", () => {
	it("parse", () => {
		const $ = scopeNode({
			numberOrString: ["number", "string"]
		})
		attest($.keywords.numberOrString.allows(5)).equals(true)
		attest($.keywords.numberOrString.allows("foo")).equals(true)
		attest($.keywords.numberOrString.allows(null)).equals(false)
	})
})
