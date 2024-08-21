import { attest, contextualize } from "@ark/attest"
import { intrinsic, rootNode } from "@ark/schema"
import { throwError, wellFormedNumberMatcher } from "@ark/util"

contextualize(() => {
	it("in/out", () => {
		const parseNumber = rootNode({
			in: {
				meta: "a well-formed numeric string",
				domain: "string",
				pattern: wellFormedNumberMatcher
			},
			morphs: (s: string) => Number.parseFloat(s)
		})
		attest(parseNumber.in.json).snap({
			domain: "string",
			pattern: ["^(?!^-0$)-?(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?$"],
			meta: "a well-formed numeric string"
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

	contextualize.each(
		"declared",
		() => {
			const declared = rootNode({
				domain: "object",
				meta: "declared object",
				predicate: () => throwError("declared out should not be invoked")
			})

			const node = rootNode({
				in: "string",
				morphs: (s: string) => JSON.parse(s),
				declaredOut: declared
			})
			return { declared, node }
		},
		it => {
			it("declared out", ({ node, declared }) => {
				attest(node.json).equals({
					in: "string",
					morphs: node.assertHasKind("morph").serializedMorphs,
					declarations: {
						out: declared.json
					}
				})

				attest(declared.description).snap("declared object")
				attest(node.out.expression).equals(declared.expression)

				// declared validator should not be called
				attest(node("{}")).equals({})
			})

			it("can be piped to declared out", ({ node, declared }) => {
				const pipeToNode = rootNode({
					in: "string",
					morphs: [(s: string) => s.slice(1), node]
				})

				attest(pipeToNode.out.description).equals(declared.description)

				attest(pipeToNode("z{}")).equals({})
			})
		}
	)
})
