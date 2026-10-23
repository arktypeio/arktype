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

const isOmittable = (element: SequenceTuple[number]) =>
	element.kind === "optionals" || element.kind === "defaultables"

export const spreadVariadicElements = (
	tupleArbitraries: fc.Arbitrary<unknown>[],
	tupleElements: SequenceTuple
): fc.Arbitrary<unknown[]> =>
	fc.nat(tupleElements.filter(isOmittable).length).chain(omittablesIncluded => {
		// omitting an element omits every element after it, so those are never
		// generated, e.g. a cyclic optional element
		let end = 0
		let omittablesSeen = 0
		while (
			end < tupleElements.length &&
			!(
				isOmittable(tupleElements[end]) &&
				omittablesSeen++ === omittablesIncluded
			)
		)
			end++
		return fc
			.tuple(...tupleArbitraries.slice(0, end))
			.map(values =>
				values.flatMap((value, i) =>
					tupleElements[i].kind === "variadic" ? (value as unknown[]) : [value]
				)
			)
	})
