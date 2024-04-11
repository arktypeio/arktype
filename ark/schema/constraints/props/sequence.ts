import {
	append,
	type array,
	type mutable,
	type satisfy,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { jsObjects } from "../../api/keywords/jsObjects.js"
import { tsKeywords } from "../../api/keywords/tsKeywords.js"
import {
	type BaseAttachments,
	type Node,
	type SchemaDef,
	implementNode
} from "../../base.js"
import type { MutableInner } from "../../kinds.js"
import type { RawSchema } from "../../schemas/schema.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type {
	NodeKeyImplementation,
	SchemaKind
} from "../../shared/implement.js"
import type { BaseConstraint, ConstraintAttachments } from "../constraint.js"
import type { MaxLengthNode } from "../refinements/maxLength.js"
import type { MinLengthNode } from "../refinements/minLength.js"

export interface NormalizedSequenceDef extends BaseMeta {
	readonly prefix?: array<SchemaDef>
	readonly optional?: array<SchemaDef>
	readonly variadic?: SchemaDef
	readonly minVariadicLength?: number
	readonly postfix?: array<SchemaDef>
}

export type SequenceDef = NormalizedSequenceDef | SchemaDef

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: array<RawSchema>
	// a list of optional elements following prefix
	readonly optional?: array<RawSchema>
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: RawSchema
	readonly minVariadicLength?: number
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: array<RawSchema>
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	def: SequenceDef
	normalizedDef: NormalizedSequenceDef
	inner: SequenceInner
	prerequisite: array
	reducibleTo: "sequence"
	childKind: SchemaKind
	attachments: SequenceAttachments
}>

export interface SequenceAttachments
	extends BaseAttachments<SequenceDeclaration>,
		ConstraintAttachments {
	prefix: array<RawSchema>
	optional: array<RawSchema>
	prevariadic: array<RawSchema>
	postfix: array<RawSchema>
	isVariadicOnly: boolean
	minVariadicLength: number
	minLength: number
	minLengthNode: MinLengthNode | null
	maxLength: number | null
	maxLengthNode: MaxLengthNode | null
	impliedSiblings: array<Node<"minLength" | "maxLength">> | null
	tuple: SequenceTuple
}

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optional"
> = {
	child: true,
	parse: (def, ctx) =>
		def.length === 0
			? // empty affixes are omitted. an empty array should therefore
				// be specified as `{ proto: Array, length: 0 }`
				undefined
			: def.map((element) => ctx.$.schema(element))
}

export const sequenceImplementation = implementNode<SequenceDeclaration>({
	kind: "sequence",
	hasAssociatedError: false,
	collapsibleKey: "variadic",
	keys: {
		prefix: fixedSequenceKeyDefinition,
		optional: fixedSequenceKeyDefinition,
		variadic: {
			child: true,
			parse: (def, ctx) => ctx.$.schema(def, ctx)
		},
		minVariadicLength: {
			// minVariadicLength is reflected in the id of this node,
			// but not its IntersectionNode parent since it is superceded by the minLength
			// node it implies
			implied: true,
			parse: (min) => (min === 0 ? undefined : min)
		},
		postfix: fixedSequenceKeyDefinition
	},
	normalize: (def) => {
		if (typeof def === "string") {
			return { variadic: def }
		}
		if (
			"variadic" in def ||
			"prefix" in def ||
			"optional" in def ||
			"postfix" in def ||
			"minVariadicLength" in def
		) {
			if (def.postfix?.length) {
				if (!def.variadic) {
					return throwParseError(postfixWithoutVariadicMessage)
				}
				if (def.optional?.length) {
					return throwParseError(postfixFollowingOptionalMessage)
				}
			}
			if (def.minVariadicLength && !def.variadic) {
				return throwParseError(
					"minVariadicLength may not be specified without a variadic element"
				)
			}
			return def
		}
		return { variadic: def }
	},
	reduce: (raw, $) => {
		let minVariadicLength = raw.minVariadicLength ?? 0
		const prefix = raw.prefix?.slice() ?? []
		const optional = raw.optional?.slice() ?? []
		const postfix = raw.postfix?.slice() ?? []
		if (raw.variadic) {
			// optional elements equivalent to the variadic parameter are redundant
			while (optional.at(-1)?.equals(raw.variadic)) {
				optional.pop()
			}

			if (optional.length === 0) {
				// If there are no optional, normalize prefix
				// elements adjacent and equivalent to variadic:
				// 		{ variadic: number, prefix: [string, number] }
				// reduces to:
				// 		{ variadic: number, prefix: [string], minVariadicLength: 1 }
				while (prefix.at(-1)?.equals(raw.variadic)) {
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
		} else if (optional.length === 0) {
			// if there's no variadic or optional parameters,
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
					postfix,
					optional,
					minVariadicLength
				},
				{ prereduced: true }
			)
		}
	},
	defaults: {
		description: (node) => {
			if (node.isVariadicOnly)
				return `${node.variadic!.nestableExpression}[]`
			const innerDescription = node.tuple
				.map((element) =>
					element.kind === "optional"
						? `${element.node.nestableExpression}?`
						: element.kind === "variadic"
							? `...${element.node.nestableExpression}[]`
							: element.node.expression
				)
				.join(", ")
			return `[${innerDescription}]`
		}
	},
	intersections: {
		sequence: (l, r, $) => {
			const rootState = intersectSequences({
				l: l.tuple,
				r: r.tuple,
				disjoint: new Disjoint({}),
				result: [],
				fixedVariants: []
			})

			const viableBranches = rootState.disjoint.isEmpty()
				? [rootState, ...rootState.fixedVariants]
				: rootState.fixedVariants

			return viableBranches.length === 0
				? rootState.disjoint!
				: viableBranches.length === 1
					? $.node(
							"sequence",
							sequenceTupleToInner(viableBranches[0].result)
						)
					: $.node(
							"union",
							viableBranches.map((state) => ({
								proto: Array,
								sequence: sequenceTupleToInner(state.result)
							}))
						)
		}
		// exactLength, minLength, and maxLength don't need to be defined
		// here since impliedSiblings guarantees they will be added
		// directly to the IntersectionNode parent of the SequenceNode
		// they exist on
	},
	construct: (self) => {
		const impliedBasis = jsObjects.Array
		const prefix = self.inner.prefix ?? []
		const optional = self.inner.optional ?? []
		const prevariadic = [...prefix, ...optional]
		const postfix = self.inner.postfix ?? []
		const isVariadicOnly = prevariadic.length + postfix.length === 0
		const minVariadicLength = self.inner.minVariadicLength ?? 0
		const minLength = prefix.length + minVariadicLength + postfix.length
		const minLengthNode =
			minLength === 0 ? null : self.$.node("minLength", minLength)
		const maxLength = self.variadic ? null : minLength + optional.length
		const maxLengthNode =
			maxLength === null ? null : self.$.node("maxLength", maxLength)
		const impliedSiblings = minLengthNode
			? maxLengthNode
				? [minLengthNode, maxLengthNode]
				: [minLengthNode]
			: maxLengthNode
				? [maxLengthNode]
				: null
		const expression = self.description
		const _childAtIndex = (data: array, index: number): RawSchema => {
			if (index < prevariadic.length) return prevariadic[index]
			const postfixStartIndex = data.length - postfix.length
			if (index >= postfixStartIndex)
				return postfix[index - postfixStartIndex]
			return (
				self.variadic ??
				throwInternalError(
					`Unexpected attempt to access index ${index} on ${expression}`
				)
			)
		}

		return {
			impliedBasis,
			prefix,
			optional,
			prevariadic,
			postfix,
			isVariadicOnly,
			minVariadicLength,
			minLength,
			minLengthNode,
			maxLength,
			maxLengthNode,
			impliedSiblings,
			tuple: sequenceInnerToTuple(self.inner),
			// TODO: ensure this can work with resolution order
			expression,
			// minLength/maxLength should be checked by Intersection before either traversal
			traverseAllows(data, ctx) {
				for (let i = 0; i < data.length; i++) {
					if (!_childAtIndex(data, i).traverseAllows(data[i], ctx)) {
						return false
					}
				}
				return true
			},
			traverseApply(data, ctx) {
				for (let i = 0; i < data.length; i++) {
					ctx.path.push(i)
					_childAtIndex(data, i).traverseApply(data[i], ctx)
					ctx.path.pop()
				}
			},
			// minLength/maxLength compilation should be handled by Intersection
			compile(js) {
				this.prefix.forEach((node, i) =>
					js.checkReferenceKey(`${i}`, node)
				)
				this.optional.forEach((node, i) => {
					const dataIndex = `${i + this.prefix.length}`
					js.if(`${dataIndex} >= ${js.data}.length`, () =>
						js.traversalKind === "Allows"
							? js.return(true)
							: js.return()
					)
					js.checkReferenceKey(dataIndex, node)
				})

				if (this.variadic) {
					js.const(
						"lastVariadicIndex",
						`${js.data}.length${
							this.postfix ? `- ${this.postfix.length}` : ""
						}`
					)
					js.for(
						"i < lastVariadicIndex",
						() => js.checkReferenceKey("i", this.variadic!),
						this.prevariadic.length
					)
					this.postfix.forEach((node, i) =>
						js.checkReferenceKey(
							`lastVariadicIndex + ${i + 1}`,
							node
						)
					)
				}

				if (js.traversalKind === "Allows") {
					js.return(true)
				}
			}
		}
	}
})

export type SequenceNode = BaseConstraint<SequenceDeclaration>

const sequenceInnerToTuple = (inner: SequenceInner): SequenceTuple => {
	const tuple: mutable<SequenceTuple> = []
	inner.prefix?.forEach((node) => tuple.push({ kind: "prefix", node }))
	inner.optional?.forEach((node) => tuple.push({ kind: "optional", node }))
	if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
	inner.postfix?.forEach((node) => tuple.push({ kind: "postfix", node }))
	return tuple
}

const sequenceTupleToInner = (tuple: SequenceTuple): SequenceInner =>
	tuple.reduce<MutableInner<"sequence">>((result, node) => {
		if (node.kind === "variadic") {
			result.variadic = node.node
		} else {
			result[node.kind] = append(result[node.kind], node.node)
		}
		return result
	}, {})

export const postfixFollowingOptionalMessage =
	"A postfix required element cannot follow an optional element"

export type postfixFollowingOptionalMessage =
	typeof postfixFollowingOptionalMessage

export const postfixWithoutVariadicMessage =
	"A postfix element requires a variadic element"

export type postfixWithoutVariadicMessage = typeof postfixWithoutVariadicMessage

export type SequenceElementKind = satisfy<
	keyof SequenceInner,
	"prefix" | "optional" | "variadic" | "postfix"
>

export type SequenceElement = {
	kind: SequenceElementKind
	node: RawSchema
}
export type SequenceTuple = array<SequenceElement>

type SequenceIntersectionState = {
	l: SequenceTuple
	r: SequenceTuple
	disjoint: Disjoint
	result: SequenceTuple
	fixedVariants: SequenceIntersectionState[]
}

const intersectSequences = (
	state: SequenceIntersectionState
): SequenceIntersectionState => {
	const [lHead, ...lTail] = state.l
	const [rHead, ...rTail] = state.r

	if (!lHead || !rHead) {
		return state
	}

	const lHasPostfix = lTail.at(-1)?.kind === "postfix"
	const rHasPostfix = rTail.at(-1)?.kind === "postfix"

	const kind: SequenceElementKind =
		lHead.kind === "prefix" || rHead.kind === "prefix"
			? "prefix"
			: lHead.kind === "optional" || rHead.kind === "optional"
				? // if either operand has postfix elements, the full-length
					// intersection can't include optional elements (though they may
					// exist in some of the fixed length variants)
					lHasPostfix || rHasPostfix
					? "prefix"
					: "optional"
				: lHead.kind === "postfix" || rHead.kind === "postfix"
					? "postfix"
					: "variadic"

	if (lHead.kind === "prefix" && rHead.kind === "variadic" && rHasPostfix) {
		const postfixBranchResult = intersectSequences({
			...state,
			fixedVariants: [],
			r: rTail.map((element) => ({ ...element, kind: "prefix" }))
		})
		if (postfixBranchResult.disjoint.isEmpty()) {
			state.fixedVariants.push(postfixBranchResult)
		}
	} else if (
		rHead.kind === "prefix" &&
		lHead.kind === "variadic" &&
		lHasPostfix
	) {
		const postfixBranchResult = intersectSequences({
			...state,
			fixedVariants: [],
			l: lTail.map((element) => ({ ...element, kind: "prefix" }))
		})
		if (postfixBranchResult.disjoint.isEmpty()) {
			state.fixedVariants.push(postfixBranchResult)
		}
	}

	const result = lHead.node.intersect(rHead.node)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			state.disjoint.add(
				result.withPrefixKey(
					// TODO: more precise path handling for Disjoints
					kind === "prefix"
						? `${state.result.length}`
						: `-${lTail.length + 1}`
				)
			)
			state.result = [
				...state.result,
				{ kind, node: tsKeywords.never.raw }
			]
		} else if (kind === "optional") {
			// if the element result is optional and unsatisfiable, the
			// intersection can still be satisfied as long as the tuple
			// ends before the disjoint element would occur
			return state
		} else {
			// if the element is variadic and unsatisfiable, the intersection
			// can be satisfied with a fixed length variant including zero
			// variadic elements
			return intersectSequences({
				...state,
				fixedVariants: [],
				// if there were any optional elements, there will be no postfix elements
				// so this mapping will never occur (which would be illegal otherwise)
				l: lTail.map((element) => ({ ...element, kind: "prefix" })),
				r: lTail.map((element) => ({ ...element, kind: "prefix" }))
			})
		}
	} else {
		state.result = [...state.result, { kind, node: result }]
	}

	const lRemaining = state.l.length
	const rRemaining = state.r.length

	if (
		lHead.kind !== "variadic" ||
		(lRemaining >= rRemaining &&
			(rHead.kind === "variadic" || rRemaining === 1))
	) {
		state.l = lTail
	}

	if (
		rHead.kind !== "variadic" ||
		(rRemaining >= lRemaining &&
			(lHead.kind === "variadic" || lRemaining === 1))
	) {
		state.r = rTail
	}

	return intersectSequences(state)
}
