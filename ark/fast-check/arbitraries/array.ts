import type { nodeOfKind, RefinementKind, SequenceTuple } from "@ark/schema"
import type { array } from "@ark/util"
import { constant, oneof, tuple, type Arbitrary } from "fast-check"
import type { RuleByRefinementKind } from "../arktypeFastCheck.ts"
import type { Ctx } from "../fastCheckContext.ts"

export const getPossiblyWeightedArray = (
	arrArbitrary: Arbitrary<unknown[]>,
	node: nodeOfKind<"sequence">,
	ctx: Ctx
): Arbitrary<unknown[]> =>
	ctx.tieStack.length ?
		oneof(
			{
				maxDepth: 2,
				depthIdentifier: `id:${node.id}`
			},
			{ arbitrary: constant([]), weight: 1 },
			{
				arbitrary: arrArbitrary,
				weight: 2
			}
		)
	:	arrArbitrary

export const spreadVariadicElements = (
	tupleArbitraries: Arbitrary<unknown>[],
	tupleElements: SequenceTuple
): Arbitrary<unknown[]> =>
	tuple(...tupleArbitraries).chain(arr => {
		const arrayWithoutOptionals = []
		const arrayWithOptionals = []

		for (const i in arr) {
			if (tupleElements[i].kind === "variadic") {
				const generatedValuesArray = (arr[i] as unknown[]).map(val =>
					constant(val)
				)
				arrayWithoutOptionals.push(...generatedValuesArray)
				arrayWithOptionals.push(...generatedValuesArray)
			} else if (tupleElements[i].kind === "optionals")
				arrayWithoutOptionals.push(constant(arr[i]))
			else {
				arrayWithoutOptionals.push(constant(arr[i]))
				arrayWithOptionals.push(constant(arr[i]))
			}
		}
		if (arrayWithOptionals.length !== arrayWithoutOptionals.length) {
			return oneof(
				tuple(...arrayWithoutOptionals),
				tuple(...arrayWithOptionals)
			)
		}
		return tuple(...arrayWithoutOptionals)
	})

export const getArrayRefinements = (
	refinements: array<nodeOfKind<RefinementKind>>
): RuleByRefinementKind => {
	const ruleByRefinementKind: RuleByRefinementKind = {}
	for (const refinement of refinements)
		ruleByRefinementKind[refinement.kind as never] = refinement.rule as never
	return ruleByRefinementKind
}
