import { attest, caller, getAssertionDataAtPosition } from "@arktype/attest"

const attestInternal = () => getAssertionDataAtPosition(caller())

describe("lib", () => {
	it("getAssertionDataAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap({
			location: { start: { line: 8, char: 3 }, end: { line: 8, char: 27 } },
			args: [
				{
					type: "SerializedAssertionData",
					relationships: { args: ["equality"], typeArgs: [] }
				}
			],
			typeArgs: [],
			errors: [],
			completions: {}
		})
	})
})
