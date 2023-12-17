import { attest, caller, getTypeAssertionsAtPosition } from "@arktype/attest"

const attestInternal = () => getTypeAssertionsAtPosition(caller())

describe("lib", () => {
	it("getTypeAssertionsAtPosition", () => {
		// Any changes above here could break assertion positions
		attest(attestInternal()).snap([
			[
				"5.3.2",
				{
					location: { start: { line: 8, char: 3 }, end: { line: 8, char: 27 } },
					args: [
						{ type: "any", relationships: { args: ["none"], typeArgs: [] } }
					],
					typeArgs: [],
					errors: [],
					completions: {}
				}
			]
		])
	})
})
