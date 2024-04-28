import { attest, contextualize } from "@arktype/attest"
import { schema } from "@arktype/schema"
import { wellFormedNumberMatcher } from "@arktype/util"

contextualize(() => {
	it("in/out", () => {
		const parseNumber = schema({
			from: {
				domain: "string",
				regex: wellFormedNumberMatcher,
				description: "a well-formed numeric string"
			},
			morphs: (s: string) => Number.parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			domain: "string",
			regex: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			description: "a well-formed numeric string"
		})
		attest(parseNumber.out.json).snap({})
	})

	it("in/out union", () => {
		const n = schema([
			{
				from: "string",
				morphs: (s: string) => Number.parseFloat(s)
			},
			"number"
		])
		attest(n.in.json).snap(["number", "string"])
		attest(n.out.json).snap({})
	})
})
