import { attest } from "@arktype/attest"
import { space } from "../space.js"

describe("space", () => {
	it("parse", () => {
		const $ = space({
			numberOrString: ["number", "string"]
		})
		attest($.keywords.numberOrString.allows(5)).equals(true)
		attest($.keywords.numberOrString.allows("foo")).equals(true)
		attest($.keywords.numberOrString.allows(null)).equals(false)
	})
})
