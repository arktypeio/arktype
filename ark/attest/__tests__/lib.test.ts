import { attest, caller, getArgTypesAtPosition } from "@arktype/attest"

const attestInternal = () => getArgTypesAtPosition(caller())

describe("lib", () => {
	it("getArgTypesAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap({
			location: { start: { line: 9, char: 3 }, end: { line: 9, char: 27 } },
			args: [
				{
					type: "SerializedAssertionData",
					relationships: { args: ["equality"], typeArgs: [] }
				}
			],
			typeArgs: [],
			errors: []
		})
	})
})
