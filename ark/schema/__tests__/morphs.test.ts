import { attest, contextualize } from "@ark/attest"
import { intrinsic, namedReference, rootSchema } from "@ark/schema"
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
		attest(parseNumber._in.json).snap({
			domain: "string",
			pattern: [
				"^(?:(?!^-0\\.?0*$)(?:-?(?:(?:0|[1-9]\\d*)(?:\\.\\d*[1-9])?)))$"
			],
			meta: "a well-formed numeric string"
		})
		attest(parseNumber._out.json).snap({})
	})

	it("a pipeline's first node is its input", () => {
		const trim = (s: string) => s.trim()
		const piped = rootSchema({ morphs: ["string", trim] }).assertIs("morph")
		attest(piped.json).snap({ morphs: ["string", namedReference(trim)] })
		attest(piped.head?.expression).snap("string")
		attest(piped.piped).equals([trim])
		attest(piped(" a ")).equals("a")
		attest(piped.allows(5)).equals(false)
		// written with in, it's the same node
		attest(rootSchema({ in: "string", morphs: trim })).equals(piped)
		attest(
			piped.$.node("morph", { in: piped.head, morphs: [trim] } as never)
		).equals(piped)
	})

	it("in/out union", () => {
		const n = rootSchema([
			{
				in: "string",
				morphs: [(s: string) => Number.parseFloat(s), intrinsic.number]
			},
			"number"
		])
		attest(n._in.expression).snap("number | string")
		attest(n._out.expression).snap("number")
	})

	it("unions declared morphs", () => {
		const morph = (value: string) => value
		const n = rootSchema([
			{ declaredIn: intrinsic.string, morphs: morph },
			{ declaredIn: intrinsic.string, morphs: morph }
		])
		attest(n._in.expression).snap("string")
	})

	contextualize.each(
		"declared",
		() => {
			const declared = rootSchema({
				meta: "declared",
				predicate: () => throwError("declared node should not be invoked")
			}).assertIs("intersection")

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
					morphs: declaredMorph.assertIs("morph").morphs.map(namedReference),
					declaredIn: declared.json,
					declaredOut: declared.json
				})

				attest(declared.description).snap("declared")
				attest(declaredMorph._in.description).equals(declared.description)
				attest(declaredMorph._out.description).equals(declared.description)

				// declared validator should not be called
				attest(declaredMorph("{}")).equals({})
			})

			it("can be piped to declaredOut", ({ declaredMorph, declared }) => {
				const pipeToNode = rootSchema({
					in: "string",
					morphs: [(s: string) => s.slice(1), declaredMorph]
				})

				attest(pipeToNode._out.description).equals(declared.description)

				attest(pipeToNode("z{}")).equals({})
			})
		}
	)
})
