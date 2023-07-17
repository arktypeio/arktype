import type { exact, List, listable } from "@arktype/util"
import { cached, listFrom } from "@arktype/util"
import type { ParseContext } from "../scope.js"
import { Scope } from "../scope.js"
import type { ConstraintInputs, PredicateNode } from "./predicate/predicate.js"
import { predicateNode } from "./predicate/predicate.js"
import type { BasisInput } from "./primitive/basis.js"
import { TypeNode } from "./type.js"

// TODO: fix
type inferPredicateDefinition<t> = t

export type inferBranches<branches extends readonly ConstraintInputs[]> = {
	[i in keyof branches]: inferPredicateDefinition<branches[i]>
}[number]

export type inferTypeInput<input extends TypeInput> =
	input extends readonly ConstraintInputs[]
		? inferBranches<input>
		: input extends ConstraintInputs
		? inferPredicateDefinition<input>
		: input extends TypeNode<infer t>
		? t
		: never

export type TypeInput = listable<ConstraintInputs>

export type validatedTypeNodeInput<
	input extends List<ConstraintInputs>,
	bases extends BasisInput[]
> = {
	[i in keyof input]: exact<
		input[i],
		ConstraintInputs //<bases[i & keyof bases]>
	>
}

export type extractBases<
	branches,
	result extends BasisInput[] = []
> = branches extends [infer head, ...infer tail]
	? extractBases<
			tail,
			[
				...result,
				head extends {
					basis: infer basis extends BasisInput
				}
					? basis
					: BasisInput
			]
	  >
	: result

// TODO: bestway to handle?
const getEmptyScope = cached(() => Scope.root({}))

const createAnonymousParseContext = (): ParseContext => ({
	baseName: "anonymous",
	path: [],
	args: {},
	scope: getEmptyScope()
})

const typeNode = <const input extends listable<ConstraintInputs>>(
	input: input,
	// TODO: check all usages to ensure metadata is being propagated
	meta = {}
) =>
	new TypeNode(
		listFrom(input).map((branch) => predicateNode(branch)),
		meta
	)

// TODO: could every node have the same functionality as type node?
const unit = <const values extends readonly unknown[]>(...values: values) =>
	typeNode(values.map((value) => ({ basis: ["===", value] }))) as TypeNode<
		values[number]
	>

export const node = Object.assign(typeNode, { unit })

// const isParsedTypeRule = (
//     input: TypeInput | readonly PredicateNode[]
// ): input is readonly PredicateNode[] =>
//     isArray(input) && (input.length === 0 || hasArkKind(input[0], "node"))

// // if (hasKey(input, "resolve")) {
// //     return input
// // }
// if (!isParsedTypeRule(input)) {
//     input = isArray(input)
//         ? input.map((branch) => new PredicateNode(branch, meta))
//         : [new PredicateNode(input, meta)]
// }
// // TODO: figure out a better way to handle sorting (in composite?)
// return alphabetizeByCondition(reduceBranches([...input]))

export const reduceBranches = (branchNodes: PredicateNode[]) => {
	if (branchNodes.length < 2) {
		return branchNodes
	}
	const uniquenessByIndex: Record<number, boolean> = branchNodes.map(() => true)
	for (let i = 0; i < branchNodes.length; i++) {
		for (
			let j = i + 1;
			j < branchNodes.length && uniquenessByIndex[i] && uniquenessByIndex[j];
			j++
		) {
			if (branchNodes[i] === branchNodes[j]) {
				// if the two branches are equal, only "j" is marked as
				// redundant so at least one copy could still be included in
				// the final set of branches.
				uniquenessByIndex[j] = false
				continue
			}
			const intersection = branchNodes[i].intersect(branchNodes[j])
			if (intersection === branchNodes[i]) {
				uniquenessByIndex[i] = false
			} else if (intersection === branchNodes[j]) {
				uniquenessByIndex[j] = false
			}
		}
	}
	return branchNodes.filter((_, i) => uniquenessByIndex[i])
}
