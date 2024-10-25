import type { nodeOfKind, SequenceTuple } from "@ark/schema"
import * as fc from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"

export const getPossiblyWeightedArray = (
	arrArbitrary: fc.Arbitrary<unknown[]>,
	node: nodeOfKind<"sequence">,
	ctx: Ctx
): fc.Arbitrary<unknown[]> =>
	ctx.tieStack.length ?
		fc.oneof(
			{
				maxDepth: 2,
				depthIdentifier: `id:${node.id}`
			},
			{ arbitrary: fc.constant([]), weight: 1 },
			{
				arbitrary: arrArbitrary,
				weight: 2
			}
		)
	:	arrArbitrary

export const spreadVariadicElements = (
	tupleArbitraries: fc.Arbitrary<unknown>[],
	tupleElements: SequenceTuple
): fc.Arbitrary<unknown[]> =>
	fc.tuple(...tupleArbitraries).chain(arr => {
		const arrayWithoutOptionals = []
		const arrayWithOptionals = []

		for (const i in arr) {
			if (tupleElements[i].kind === "variadic") {
				const generatedValuesArray = (arr[i] as unknown[]).map(val =>
					fc.constant(val)
				)
				arrayWithoutOptionals.push(...generatedValuesArray)
				arrayWithOptionals.push(...generatedValuesArray)
			} else if (tupleElements[i].kind === "optionals")
				arrayWithOptionals.push(fc.constant(arr[i]))
			else {
				arrayWithoutOptionals.push(fc.constant(arr[i]))
				arrayWithOptionals.push(fc.constant(arr[i]))
			}
		}
		if (arrayWithOptionals.length !== arrayWithoutOptionals.length) {
			return fc.oneof(
				fc.tuple(...arrayWithoutOptionals),
				fc.tuple(...arrayWithOptionals)
			)
		}
		return fc.tuple(...arrayWithOptionals)
	})
