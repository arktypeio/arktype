import { attest, contextualize } from "@ark/attest"
import { fuzz } from "./fuzz.ts"

contextualize(() => {
	it("set algebra agrees with allows", () => {
		attest(fuzz(1, 300).failures).equals({
			and: [],
			or: [],
			extends: [],
			overlaps: [],
			composite: [],
			discriminate: []
		})
	}).timeout(60000)
})
