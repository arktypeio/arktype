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
			minVariadicLength !== (raw.minVariadicLength ?? 0) ||
			// or any postfix elements were moved to prefix
			(raw.prefix && raw.prefix.length !== prefix.length)
		) {
			// reparse the reduced def
			return $.node(
				"sequence",
				{
					...raw,
					// empty lists are omitted when it's created
					prefix,
					defaultables,
					optionals,
					postfix,
					...(minVariadicLength ? { minVariadicLength } : {})
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
				realigned: false,
				ctx
			})

			const branches = [rootState, ...rootState.fixedVariants]
			const viableBranches = branches.filter(
				state => state.disjoint.length === 0 && fitsLength(state)
			)

			return (
				viableBranches.length === 0 ?
					// variants share the entries found before they branched
					new Disjoint(
						...new Set(
							branches.filter(fitsLength).flatMap(state => state.disjoint)
						)
					)
				: viableBranches.length === 1 && viableBranches[0].result.length ?
					ctx.$.node("sequence", sequenceTupleToInner(viableBranches[0].result))
				:	ctx.$.node("union", {
						branches: viableBranches.map(state =>
							ctx.$.node("intersection", {
								proto: ctx.$.node("proto", { proto: Array }),
								// an empty tuple has no sequence, only an exact length of 0
								...(state.result.length ?
									{
										structure: ctx.$.node("structure", {
											sequence: ctx.$.node(
												"sequence",
												sequenceTupleToInner(state.result)
											)
										})
									}
								:	{ exactLength: ctx.$.node("exactLength", { rule: 0 }) })
							})
						)
					})
			)
		}

		// exactLength, minLength, and maxLength don't need to be defined
		// here since impliedBy guarantees they will be added
		// directly to the IntersectionNode parent of the SequenceNode
		// they exist on
	}
}

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
	// elements moved to meet others, so an index holds them only at some lengths
	realigned: boolean
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

	// an element before a variadic followed by postfix elements may also meet
	// those elements directly, in a fixed length variant
	const postfixSide =
		kind !== "prefix" ? undefined
		: rHead.kind === "variadic" && rHasPostfix ? "r"
		: lHead.kind === "variadic" && lHasPostfix ? "l"
		: undefined
	if (postfixSide) {
		s.fixedVariants.push(
			_intersectSequences({
				...s,
				disjoint: new Disjoint(...s.disjoint),
				[postfixSide]: asPrefix(postfixSide === "l" ? lTail : rTail),
				realigned: true
			})
		)
	}

	const result = intersectOrPipeNodes(lHead.node, rHead.node, s.ctx)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			s.disjoint.push(
				...result.withPrefixKey(
					// ideally we could handle disjoint paths more precisely here,
					// but not trivial to serialize postfix elements as keys
					kind === "prefix" ? s.result.length : `-${lTail.length + 1}`,
					// a discriminant must be at an index both elements are at,
					// whatever the tuple's length
					(
						kind === "prefix" &&
							!s.realigned &&
							elementIsRequired(lHead) &&
							elementIsRequired(rHead)
					) ?
						"required"
					:	"optional"
				)
			)
			s.result = [...s.result, { kind, node: $ark.kw.never.internal }]
		} else if (kind === "optionals" || kind === "defaultables") {
			// if the element result is optional and unsatisfiable, the
			// intersection can still be satisfied as long as the tuple
			// ends before the disjoint element would occur
			return s
		} else {
			// if the element is variadic and unsatisfiable, the variadic elements
			// can't overlap, so the shorter postfix is preceded by its own
			// variadic elements to align with the longer one
			return _intersectSequences({
				...s,
				l: alignPostfix(lHead, lTail, rTail.length),
				r: alignPostfix(rHead, rTail, lTail.length),
				realigned: true
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
			(rHead.kind === "variadic" ||
				rHead.kind === "postfix" ||
				rRemaining === 1))
	)
		s.l = lTail

	if (
		rHead.kind !== "variadic" ||
		(rRemaining >= lRemaining &&
			(lHead.kind === "variadic" ||
				lHead.kind === "postfix" ||
				lRemaining === 1))
	)
		s.r = rTail

	return _intersectSequences(s)
}

const asPrefix = (elements: SequenceTuple): SequenceTuple =>
	elements.map(element => ({ ...element, kind: "prefix" }))

const alignPostfix = (
	variadic: SequenceElement,
	postfix: SequenceTuple,
	length: number
): SequenceTuple =>
	asPrefix([
		...Array.from({ length: length - postfix.length }, () => variadic),
		...postfix
	])

const elementIsRequired = (el: SequenceElement) =>
	el.kind === "prefix" || el.kind === "postfix"

// a branch with required elements left on either side has no length both allow
const fitsLength = (s: SequenceIntersectionState) =>
	!s.l.some(elementIsRequired) && !s.r.some(elementIsRequired)
