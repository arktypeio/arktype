import { attest, contextualize } from "@arktype/attest"
import { schema, tsKeywords } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"

contextualize(() => {
	it("in/out", () => {
		const parseNumber = schema({
			in: {
				domain: "string",
				pattern: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morphs: (s: string) => Number.parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			domain: "string",
			pattern: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			description: "a well-formed numeric string"
		})
		attest(parseNumber.out.json).snap({})
	})

	it("in/out union", () => {
		const n = schema([
			{
				in: "string",
				morphs: [(s: string) => Number.parseFloat(s), tsKeywords.number]
			},
			"number"
		])
		attest(n.in.expression).snap("number | string")
		attest(n.out.expression).snap("number")
	})
})
