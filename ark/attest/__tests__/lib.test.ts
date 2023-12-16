import { attest, caller, getTypeAssertionsAtPosition } from "@arktype/attest"

const attestInternal = () => getTypeAssertionsAtPosition(caller())

describe("lib", () => {
	it("getTypeAssertionsAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap()
	})
})
