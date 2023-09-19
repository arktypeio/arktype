import type { conform } from "@arktype/util"
import type { PredicateInput, PredicateNode } from "./predicate.js"
import type { parseNode, TypeNode } from "./type.js"
import { UnionNode } from "./union.js"

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: conform<
				branches[i],
				branches[i] extends PredicateInput<infer basis>
					? PredicateInput<basis>
					: PredicateInput
			>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseNode<
				typeof PredicateNode,
				conform<branches[i], PredicateInput>
			> extends PredicateNode<infer t>
				? t
				: unknown
		}[number]
	>
}

type UnitsNodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: branches
	): TypeNode<branches[number]>
}

const from = ((...branches: never[]) =>
	new (UnionNode as any)(branches)) as {} as NodeParser

const fromUnits = ((...branches: never[]) =>
	new (UnionNode as any)(branches)) as {} as UnitsNodeParser

export const node = Object.assign(from, {
	units: fromUnits
})
