import type { conform } from "@arktype/util"
import type { PredicateInput, PredicateNode } from "./predicate.js"
import type { parseNode } from "./type.js"
import { TypeNode } from "./type.js"

export const node = Object.assign(TypeNode.from, {
	units: TypeNode.fromUnits
})

// static from = ((...branches: never[]) =>
// new TypeNode(branches as never)) as NodeParser

// const fromUnits = ((...branches: never[]) =>
// new TypeNode(branches as never)) as UnitsNodeParser

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
