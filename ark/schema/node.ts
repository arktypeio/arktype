import type { conform } from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import type {
	IntersectionInput,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type { MorphInput, validateMorphInput } from "./morph.js"
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
			[i in keyof branches]: parseBranch<branches[i]>
		}[number]
	>
}

type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

type parseBranch<branch> = branch extends IntersectionInput
	? parseIntersection<branch>["infer"]
	: branch extends MorphInput
	? (
			In: parseIntersection<branch["in"]>
	  ) => Out<parseIntersection<branch["out"]>>
	: unknown

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
