import type { nodeOfKind, SequenceTuple } from "arktype/schema"
import * as fc from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"

export const getPossiblyWeightedArray = (
	arrArbitrary: fc.Arbitrary<unknown[]>,
	node: nodeOfKind<"sequence">,
	refinements: fc.ArrayConstraints,
	ctx: Ctx
): fc.Arbitrary<unknown[]> =>
	ctx.tieStack.length && !refinements.minLength ?
		fc.oneof(
			{
				maxDepth: 2,
				depthIdentifier: `id:${node.id}`
			},
			{ arbitrary: fc.constant(null).map<unknown[]>(() => []), weight: 1 },
			{
				arbitrary: arrArbitrary,
				weight: 2
			}
		)
	:	arrArbitrary

const isOmittable = (element: SequenceTuple[number]) =>
	element.kind === "optionals" || element.kind === "defaultables"

type TupleLengthOption = {
	end: number
	variadicConstraints?: fc.ArrayConstraints
}

export const spreadVariadicElements = (
	elementArbitraries: fc.Arbitrary<unknown>[],
	node: nodeOfKind<"sequence">,
	refinements: fc.ArrayConstraints,
	ctx: Ctx
): fc.Arbitrary<unknown[]> => {
	const tupleElements = node.tuple
	const omittableCount = tupleElements.filter(isOmittable).length
	const options: TupleLengthOption[] = []

	for (
		let omittablesIncluded = 0;
		omittablesIncluded <= omittableCount;
		omittablesIncluded++
	) {
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

		const included = tupleElements.slice(0, end)
		const hasVariadic = included.some(el => el.kind === "variadic")
		const fixedCount = hasVariadic ? included.length - 1 : included.length

		if (!hasVariadic) {
			if (
				(refinements.minLength === undefined ||
					fixedCount >= refinements.minLength) &&
				(refinements.maxLength === undefined ||
					fixedCount <= refinements.maxLength)
			)
				options.push({ end })
			continue
		}

		const minLength = Math.max(0, (refinements.minLength ?? 0) - fixedCount)
		const maxLength =
			refinements.maxLength !== undefined ?
				refinements.maxLength - fixedCount
			:	undefined
		if (maxLength === undefined || minLength <= maxLength) {
			options.push({
				end,
				variadicConstraints:
					maxLength !== undefined ? { minLength, maxLength } : { minLength }
			})
		}
	}

	if (!options.length) {
		throw new Error(
			`No tuple length satisfies length constraints (${refinements.minLength ?? 0}..${refinements.maxLength ?? "∞"}).`
		)
	}

	const optionArbitraries = options.map(({ end, variadicConstraints }) => {
		const tupleArbitraries = tupleElements
			.slice(0, end)
			.map((element, i) =>
				element.kind === "variadic" ?
					getPossiblyWeightedArray(
						fc.array(elementArbitraries[i], variadicConstraints),
						node,
						variadicConstraints ?? {},
						ctx
					)
				:	elementArbitraries[i]
			)
		return fc
			.tuple(...tupleArbitraries)
			.map(values =>
				values.flatMap((value, i) =>
					tupleElements[i].kind === "variadic" ? (value as unknown[]) : [value]
				)
			)
	})

	return (
		optionArbitraries.length === 1 ? optionArbitraries[0]
		: ctx.tieStack.length ?
			fc.oneof(
				{ maxDepth: 4, depthIdentifier: ctx.depthIdentifier },
				...optionArbitraries
			)
		:	fc.oneof(...optionArbitraries)
	)
}
