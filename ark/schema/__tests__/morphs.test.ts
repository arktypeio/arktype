import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"

describe("morphs", () => {
	it("in/out", () => {
		const parseNumber = schema({
			in: {
				basis: "string",
				regex: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morph: (s: string) => parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			basis: "string",
			regex: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			description: "a well-formed numeric string"
		})
		attest(parseNumber.out.json).snap({})
	})

	it("in/out union", () => {
		const n = schema(
			{
				in: "string",
				morph: (s: string) => parseFloat(s)
			},
			"number"
		)
		attest(n.in.json).snap(["number", "string"])
		attest(n.out.json).snap({})
	})
})
