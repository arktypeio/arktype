import {
	$ark,
	Disjoint,
	type IntersectionContext,
	type Sequence,
	type SequenceElement,
	type SequenceElementKind,
	type SequenceTuple,
	type mutableInnerOfKind
} from "@ark/schema"
import { append, throwInternalError, throwParseError } from "@ark/util"
import type { setImplementationOf } from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"
import { writeDefaultIntersectionMessage } from "./prop.ts"

export const sequence: setImplementationOf<Sequence.Declaration> = {
	reduce: (raw, $) => {
		let minVariadicLength = raw.minVariadicLength ?? 0
		const prefix = raw.prefix?.slice() ?? []
		const defaultables = raw.defaultables?.slice() ?? []
		const optionals = raw.optionals?.slice() ?? []
		const postfix = raw.postfix?.slice() ?? []
		if (raw.variadic) {
			// optional elements equivalent to the variadic parameter are redundant
			while (optionals[optionals.length - 1]?.equals(raw.variadic))
				optionals.pop()

			if (optionals.length === 0 && defaultables.length === 0) {
				// If there are no optional, normalize prefix
				// elements adjacent and equivalent to variadic:
				// 		{ variadic: number, prefix: [string, number] }
				// reduces to:
				// 		{ variadic: number, prefix: [string], minVariadicLength: 1 }
				while (prefix[prefix.length - 1]?.equals(raw.variadic)) {
					prefix.pop()
					minVariadicLength++
				}
			}
			// Normalize postfix elements adjacent and equivalent to variadic:
			// 		{ variadic: number, postfix: [number, number, 5] }
			// reduces to:
			// 		{ variadic: number, postfix: [5], minVariadicLength: 2 }
			while (postfix[0]?.equals(raw.variadic)) {
				postfix.shift()
				minVariadicLength++
			}
		} else if (optionals.length === 0 && defaultables.length === 0) {
			// if there's no variadic, optional or defaultable elements,
			// postfix can just be appended to prefix
			prefix.push(...postfix.splice(0))
		}
		if (
			// if any variadic adjacent elements were moved to minVariadicLength
			minVariadicLength !== raw.minVariadicLength ||
			// or any postfix elements were moved to prefix
			(raw.prefix && raw.prefix.length !== prefix.length)
		) {
			// reparse the reduced def
			return $.node(
				"sequence",
				{
					...raw,
					// empty lists will be omitted during parsing
					prefix,
					defaultables,
					optionals,
					postfix,
					minVariadicLength
				},
				{ prereduced: true }
			)
		}
	},
	intersections: {
		sequence: (l, r, ctx) => {
			const rootState = _intersectSequences({
				l: l.tuple,
				r: r.tuple,
				disjoint: new Disjoint(),
				result: [],
				fixedVariants: [],
				ctx
			})

			const viableBranches =
				rootState.disjoint.length === 0 ?
					[rootState, ...rootState.fixedVariants]
				:	rootState.fixedVariants

			return (
				viableBranches.length === 0 ? rootState.disjoint!
				: viableBranches.length === 1 && viableBranches[0].result.length ?
					ctx.$.node("sequence", sequenceTupleToInner(viableBranches[0].result))
				:	ctx.$.node(
						"union",
						viableBranches.map(state => arraySchemaOf(state.result))
					)
			)
		}

		// exactLength, minLength, and maxLength don't need to be defined
		// here since impliedSiblings guarantees they will be added
		// directly to the IntersectionNode parent of the SequenceNode
		// they exist on
	}
}

// a sequence has at least one element, so an empty tuple is an array of length 0
const arraySchemaOf = (tuple: SequenceTuple) =>
	tuple.length ?
		{ proto: Array, sequence: sequenceTupleToInner(tuple) }
	:	{ proto: Array, exactLength: 0 }

const sequenceTupleToInner = (tuple: SequenceTuple): Sequence.Inner =>
	tuple.reduce<mutableInnerOfKind<"sequence">>((result, element) => {
		if (element.kind === "variadic") result.variadic = element.node
		else if (element.kind === "defaultables") {
			result.defaultables = append(result.defaultables, [
				[element.node, element.default]
			])
		} else result[element.kind] = append(result[element.kind], element.node)

		return result
	}, {})

type SequenceIntersectionState = {
	l: SequenceTuple
	r: SequenceTuple
	disjoint: Disjoint
	result: SequenceTuple
	fixedVariants: SequenceIntersectionState[]
	ctx: IntersectionContext
}

const _intersectSequences = (
	s: SequenceIntersectionState
): SequenceIntersectionState => {
	const [lHead, ...lTail] = s.l
	const [rHead, ...rTail] = s.r

	if (!lHead || !rHead) return s

	const lHasPostfix = lTail[lTail.length - 1]?.kind === "postfix"
	const rHasPostfix = rTail[rTail.length - 1]?.kind === "postfix"

	const kind: SequenceElementKind =
		lHead.kind === "prefix" || rHead.kind === "prefix" ? "prefix"
		: lHead.kind === "postfix" || rHead.kind === "postfix" ? "postfix"
		: lHead.kind === "variadic" && rHead.kind === "variadic" ? "variadic"
			// if either operand has postfix elements, the full-length
			// intersection can't include optional elements (though they may
			// exist in some of the fixed length variants)
		: lHasPostfix || rHasPostfix ? "prefix"
		: lHead.kind === "defaultables" || rHead.kind === "defaultables" ?
			"defaultables"
		:	"optionals"

	if (lHead.kind === "prefix" && rHead.kind === "variadic" && rHasPostfix) {
		const postfixBranchResult = _intersectSequences({
			...s,
			fixedVariants: [],
			r: rTail.map(element => ({ ...element, kind: "prefix" }))
		})
		if (postfixBranchResult.disjoint.length === 0)
			s.fixedVariants.push(postfixBranchResult)
	} else if (
		rHead.kind === "prefix" &&
		lHead.kind === "variadic" &&
		lHasPostfix
	) {
		const postfixBranchResult = _intersectSequences({
			...s,
			fixedVariants: [],
			l: lTail.map(element => ({ ...element, kind: "prefix" }))
		})
		if (postfixBranchResult.disjoint.length === 0)
			s.fixedVariants.push(postfixBranchResult)
	}

	const result = intersectOrPipeNodes(lHead.node, rHead.node, s.ctx)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			s.disjoint.push(
				...result.withPrefixKey(
					// ideally we could handle disjoint paths more precisely here,
					// but not trivial to serialize postfix elements as keys
					kind === "prefix" ? s.result.length : `-${lTail.length + 1}`,
					// both operands must be required for the disjoint to be considered required
					elementIsRequired(lHead) && elementIsRequired(rHead) ?
						"required"
					:	"optional"
				)
			)
			s.result = [...s.result, { kind, node: $ark.intrinsic.never.internal }]
		} else if (kind === "optionals" || kind === "defaultables") {
			// if the element result is optional and unsatisfiable, the
			// intersection can still be satisfied as long as the tuple
			// ends before the disjoint element would occur
			return s
		} else {
			// if the element is variadic and unsatisfiable, the intersection
			// can be satisfied with a fixed length variant including zero
			// variadic elements
			return _intersectSequences({
				...s,
				fixedVariants: [],
				// if there were any optional elements, there will be no postfix elements
				// so this mapping will never occur (which would be illegal otherwise)
				l: lTail.map(element => ({ ...element, kind: "prefix" })),
				r: lTail.map(element => ({ ...element, kind: "prefix" }))
			})
		}
	} else if (kind === "defaultables") {
		if (
			lHead.kind === "defaultables" &&
			rHead.kind === "defaultables" &&
			lHead.default !== rHead.default
		) {
			throwParseError(
				writeDefaultIntersectionMessage(lHead.default, rHead.default)
			)
		}

		s.result = [
			...s.result,
			{
				kind,
				node: result,
				default:
					lHead.kind === "defaultables" ? lHead.default
					: rHead.kind === "defaultables" ? rHead.default
					: throwInternalError(
							`Unexpected defaultable intersection from ${lHead.kind} and ${rHead.kind} elements.`
						)
			}
		]
	} else s.result = [...s.result, { kind, node: result }]

	const lRemaining = s.l.length
	const rRemaining = s.r.length

	if (
		lHead.kind !== "variadic" ||
		(lRemaining >= rRemaining &&
			(rHead.kind === "variadic" || rRemaining === 1))
	)
		s.l = lTail

	if (
		rHead.kind !== "variadic" ||
		(rRemaining >= lRemaining &&
			(lHead.kind === "variadic" || lRemaining === 1))
	)
		s.r = rTail

	return _intersectSequences(s)
}

const elementIsRequired = (el: SequenceElement) =>
	el.kind === "prefix" || el.kind === "postfix"
