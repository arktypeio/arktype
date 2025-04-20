import { attest, contextualize } from "@ark/attest"
import { intrinsic, rootSchema } from "@ark/schema"
import { throwError, wellFormedNumberMatcher } from "@ark/util"

contextualize(() => {
	it("in/out", () => {
		const parseNumber = rootSchema({
			in: {
				meta: "a well-formed numeric string",
				domain: "string",
				pattern: wellFormedNumberMatcher
			},
			morphs: (s: string) => Number.parseFloat(s)
		})
		attest(parseNumber.rawIn.json).snap({
			domain: "string",
			pattern: [
				"^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?)?))$"
			],
			meta: "a well-formed numeric string"
		})
		attest(parseNumber.rawOut.json).snap({})
	})

	it("in/out union", () => {
		const n = rootSchema([
			{
				in: "string",
				morphs: [(s: string) => Number.parseFloat(s), intrinsic.number]
			},
			"number"
		])
		attest(n.rawIn.expression).snap("number | string")
		attest(n.rawOut.expression).snap("number")
	})

	contextualize.each(
		"declared",
		() => {
			const declared = rootSchema({
				meta: "declared",
				predicate: () => throwError("declared node should not be invoked")
			}).assertHasKind("intersection")

			const declaredMorph = rootSchema({
				morphs: (s: string) => JSON.parse(s),
				declaredIn: declared,
				declaredOut: declared
			})

			return { declared, declaredMorph }
		},
		it => {
			it("preserves and extracts the declarations without calling them", ({
				declaredMorph,
				declared
			}) => {
				attest(declaredMorph.json).equals({
					morphs: declaredMorph.assertHasKind("morph").serializedMorphs,
					declaredIn: declared.json,
					declaredOut: declared.json
				})

				attest(declared.description).snap("declared")
				attest(declaredMorph.rawIn.description).equals(declared.description)
				attest(declaredMorph.rawOut.description).equals(declared.description)

				// declared validator should not be called
				attest(declaredMorph("{}")).equals({})
			})

			it("can be piped to declaredOut", ({ declaredMorph, declared }) => {
				const pipeToNode = rootSchema({
					in: "string",
					morphs: [(s: string) => s.slice(1), declaredMorph]
				})

				attest(pipeToNode.rawOut.description).equals(declared.description)

				attest(pipeToNode("z{}")).equals({})
			})
		}
	)
})
