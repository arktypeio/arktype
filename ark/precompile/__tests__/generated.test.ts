import { attest, contextualize } from "@ark/attest"
import { arkToArbitrary } from "@ark/fast-check"
import type { BaseRoot } from "@ark/schema"
import { scope, type } from "arktype"
import fc from "fast-check"
import { compare, observeArktype } from "./differential.ts"
import { dataOf, defOf, noise, nodeOf, sourceOf, type Node } from "./grammar.ts"

// checks the generated programs of the precompilation design (design/precompile.md §12): definitions
// generated from arktype's grammar, each precompiled and compared with arktype on data generated for it
// ARK_PRECOMPILE_FUZZ=<count>[:<seed>] checks that many programs from the seed

type Definition = Node | { aliases: Record<string, Node> }

const definitions: fc.Arbitrary<Definition> = fc.oneof(
	{ weight: 3, arbitrary: nodeOf([]) },
	fc
		.record({ a: nodeOf(["a", "b"]), b: nodeOf(["a", "b"]) })
		.map(aliases => ({ aliases }))
)

// @ark/fast-check generates what a Type allows, except where it can't or where it doesn't bound a cycle's depth
const allowedDataOf = (T: BaseRoot): fc.Arbitrary<unknown> => {
	if (T.isCyclic) return noise
	try {
		return arkToArbitrary(T as never)
	} catch {
		return noise
	}
}

interface Program {
	source: string
	types: Record<string, BaseRoot>
	inputs: Record<string, fc.Arbitrary<unknown>>
}

const programOf = (definition: Definition): Program | undefined => {
	const nodes = "aliases" in definition ? definition.aliases : { T: definition }
	const defs = Object.fromEntries(
		Object.entries(nodes).map(([name, node]) => [name, defOf(node)])
	)
	let types: Record<string, BaseRoot>
	try {
		types =
			"aliases" in definition ?
				(scope(defs as never).export() as never)
			:	{ T: type(defs.T as never) as never }
		// a scope can throw for a definition once a Type it exports is described
		for (const T of Object.values(types)) void T.description
	} catch {
		return
	}
	// a cycle's data is generated to a bounded depth
	const dataByAlias = fc.letrec(tie =>
		Object.fromEntries(
			Object.entries(nodes).map(([name, node]) => [
				name,
				fc.oneof(
					{ maxDepth: 2, depthIdentifier: "alias" },
					noise,
					dataOf(node, tie)
				)
			])
		)
	)
	return {
		source:
			"aliases" in definition ?
				`scope(${sourceOf(defs)}).export()`
			:	`type(${sourceOf(defs.T)})`,
		types,
		inputs: Object.fromEntries(
			Object.entries(types).map(([name, T]) => [
				name,
				fc.oneof(dataByAlias[name], allowedDataOf(T))
			])
		)
	}
}

// a program prints as its source, and its inputs follow it by the name of the Type they're for
const programs = definitions.chain(definition => {
	const program = programOf(definition)
	if (!program) return fc.constant(undefined)
	return fc.tuple(
		fc.constant(
			Object.assign(program, { [fc.toStringMethod]: () => program.source })
		),
		fc.record(
			Object.fromEntries(
				Object.entries(program.inputs).map(([name, inputs]) => [
					name,
					fc.array(inputs, { minLength: 1, maxLength: 6 })
				])
			)
		)
	)
})

const [runs = 200, seed = 1] =
	process.env.ARK_PRECOMPILE_FUZZ?.split(":").map(Number) ?? []

contextualize(() => {
	it("agree with arktype", async () => {
		let precompiled = 0
		await fc.assert(
			fc.asyncProperty(programs, async generated => {
				if (!generated) return
				const [program, inputsByName] = generated
				for (const [name, T] of Object.entries(program.types)) {
					const inputs = inputsByName[name]
					const comparison = await compare(T, inputs, observeArktype(T, inputs))
					if (comparison.refusal === undefined) precompiled++
					attest(comparison.disagreements).equals([])
				}
			}),
			{ numRuns: runs, seed }
		)
		attest(precompiled > runs / 2).equals(true)
	}).timeout(runs * 1000)
})
