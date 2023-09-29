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
				branches[i] extends BranchInput<infer t, infer u>
					? BranchInput<t, u>
					: BranchInput
			>
		}
		// TODO: add morph nodes
	): TypeNode<
		{
			[i in keyof branches]: parseBranch<branches[i]>
		}[number]
	>
}

type parseBranch<branch> = branch extends IntersectionInput
	? parseNode<
			typeof IntersectionNode,
			conform<branch, IntersectionInput>
	  > extends IntersectionNode<infer t>
		? t
		: unknown
	: branch extends MorphInput
	? (In: parseBranch<branch["in"]>) => Out<parseBranch<branch["out"]>>
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
