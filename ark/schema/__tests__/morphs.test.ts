import { attest } from "@arktype/attest"
import { root } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"

describe("morphs", () => {
	it("in/out", () => {
		const parseNumber = root({
			in: {
				domain: "string",
				regex: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morphs: (s: string) => parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			domain: "string",
			regex: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			description: "a well-formed numeric string"
		})
		attest(parseNumber.out.json).snap({})
	})

	it("in/out union", () => {
		const n = root([
			{
				in: "string",
				morphs: (s: string) => parseFloat(s)
			},
			"number"
		])
		attest(n.in.json).snap(["number", "string"])
		attest(n.out.json).snap({})
	})
})
