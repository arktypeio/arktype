import { attest, contextualize } from "@ark/attest"
import { intrinsic, rootNode } from "@ark/schema"
import { wellFormedNumberMatcher } from "@ark/util"

contextualize(() => {
	it("in/out", () => {
		const parseNumber = rootNode({
			in: {
				"meta.description": "a well-formed numeric string",
				domain: "string",
				pattern: wellFormedNumberMatcher
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
		const n = rootNode([
			{
				in: "string",
				morphs: [(s: string) => Number.parseFloat(s), intrinsic.number]
			},
			"number"
		])
		attest(n.in.expression).snap("number | string")
		attest(n.out.expression).snap("number")
	})
})
