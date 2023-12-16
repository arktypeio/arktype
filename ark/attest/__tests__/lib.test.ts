import { attest, caller, getAssertionDataAtPosition } from "@arktype/attest"

const attestInternal = () => getAssertionDataAtPosition(caller())

describe("lib", () => {
	it("getAssertionDataAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap()
	})
})
