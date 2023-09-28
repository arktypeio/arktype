import type { conform } from "@arktype/util"
import type { IntersectionInput, IntersectionNode } from "./intersection.js"
import type { parseNode, TypeNode } from "./type.js"
import { UnionNode } from "./union.js"

type NodeParser = {
	<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: conform<
				branches[i],
				branches[i] extends IntersectionInput<infer basis>
					? IntersectionInput<basis>
					: IntersectionInput
			>
		}
	): TypeNode<
		{
			[i in keyof branches]: parseNode<
				typeof IntersectionNode,
				conform<branches[i], IntersectionInput>
			> extends IntersectionNode<infer t>
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
