import type { conform } from "@arktype/util"
import type {
	IntersectionInput,
	IntersectionNode,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type { MorphInput, parseMorph, validateMorphInput } from "./morph.js"
import type { TypeNode } from "./type.js"
import type { BranchInput } from "./union.js"
import { UnionNode } from "./union.js"

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateBranchInput<branches[i]>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseBranch<branches[i]>["infer"]
		}[number]
	>
}

type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

type parseBranch<branch> = branch extends MorphInput
	? parseMorph<branch>
	: branch extends IntersectionInput
	? parseIntersection<branch>
	: IntersectionNode

type UnitsNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: branches
	): TypeNode<branches[number]>
}

const from = ((...branches: BranchInput[]) =>
	new (UnionNode as any)(branches)) as {} as NodeParser

const fromUnits = ((...branches: never[]) =>
	new (UnionNode as any)(branches)) as {} as UnitsNodeParser

export const node = Object.assign(from, {
	units: fromUnits
})
