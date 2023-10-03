import type {
	conform,
	ErrorMessage,
	exactMessageOnError,
	listable
} from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import type { BasisInput, validateBasisInput } from "./constraints/basis.js"
import type {
	BasisedBranchInput,
	IntersectionInput,
	IntersectionNode,
	NarrowedBranchInput
} from "./intersection.js"
import type { Morph, MorphInput } from "./morph.js"
import type { parseNode, TypeNode } from "./type.js"
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

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? branch[k]
		: ErrorMessage<`'${k &
				string}' is not allowed by ${branch["basis"] extends string
				? `basis '${branch["basis"]}'`
				: `this schema's basis`}`>
}

type validateBranchInput<input> = conform<
	input,
	"morphs" extends keyof input
		? validateMorphInput<input>
		: validateIntersectionInput<input>
>

type validateMorphInput<input> = {
	[k in keyof input]: k extends "in" | "out"
		? validateIntersectionInput<input[k]>
		: k extends "morphs"
		? listable<Morph>
		: `'${k & string}' is not a valid morph schema key`
}

type validateIntersectionInput<input> = input extends BasisInput
	? validateBasisInput<input>
	: input extends BasisedBranchInput<infer basis>
	? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
	: input extends NarrowedBranchInput
	? exactMessageOnError<input, NarrowedBranchInput>
	: IntersectionInput | MorphInput

type parseBranch<branch> = branch extends IntersectionInput
	? parseIntersection<branch>
	: branch extends MorphInput
	? (
			In: parseIntersection<branch["in"]>
	  ) => Out<parseIntersection<branch["out"]>>
	: unknown

type parseIntersection<input> = input extends IntersectionInput
	? parseNode<typeof IntersectionNode, input> extends IntersectionNode<infer t>
		? t
		: unknown
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
