import type { conform } from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import type { IntersectionInput, IntersectionNode } from "./intersection.js"
import type { MorphInput } from "./morph.js"
import type { parseNode, TypeNode } from "./type.js"
import type { BranchInput } from "./union.js"
import { UnionNode } from "./union.js"

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: conform<
				branches[i],
				branches[i] extends BranchInput<infer basis, infer outBasis>
					? BranchInput<basis, outBasis>
					: BranchInput
			>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseBranch<branches[i]>
		}[number]
	>
}

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
