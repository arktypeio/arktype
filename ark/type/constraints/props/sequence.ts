import {
	append,
	throwInternalError,
	throwParseError,
	type List,
	type mutable,
	type satisfy
} from "@arktype/util"
import type { TypeSchema } from "../../base.js"
import type { MutableInner } from "../../kinds.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type {
	NodeKeyImplementation,
	TypeKind,
	nodeImplementationOf
} from "../../shared/implement.js"
import type { Type } from "../../types/type.js"
import { BaseConstraint } from "../constraint.js"

export interface NormalizedSequenceSchema extends BaseMeta {
	readonly prefix?: readonly TypeSchema[]
	readonly optionals?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
	readonly minVariadicLength?: number
	readonly postfix?: readonly TypeSchema[]
}

export type SequenceSchema = NormalizedSequenceSchema | TypeSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: readonly Type[]
	// a list of optional elements following prefix
	readonly optionals?: readonly Type[]
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: Type
	readonly minVariadicLength?: number
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: readonly Type[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	schema: SequenceSchema
	normalizedSchema: NormalizedSequenceSchema
	inner: SequenceInner
	prerequisite: List
	reducibleTo: "sequence"
	childKind: TypeKind
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optionals"
> = {
	child: true,
	parse: (schema, ctx) =>
		schema.length === 0
			? // empty affixes are omitted. an empty array should therefore
			  // be specified as `{ proto: Array, length: 0 }`
			  undefined
			: schema.map((element) => ctx.$.parseTypeSchema(element))
}

export class SequenceNode extends BaseConstraint<SequenceDeclaration> {
	static implementation: nodeImplementationOf<SequenceDeclaration> =
		this.implement({
			hasAssociatedError: false,
			collapsibleKey: "variadic",
			keys: {
				prefix: fixedSequenceKeyDefinition,
				optionals: fixedSequenceKeyDefinition,
				variadic: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeSchema(schema)
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
			normalize: (schema) => {
				if (typeof schema === "string") {
					return { variadic: schema }
				}
				if (
					"variadic" in schema ||
					"prefix" in schema ||
					"optionals" in schema ||
					"postfix" in schema ||
					"minVariadicLength" in schema
				) {
					if (schema.postfix?.length) {
						if (!schema.variadic) {
							return throwParseError(postfixWithoutVariadicMessage)
						}
						if ((schema.optionals as any)?.length) {
							return throwParseError(postfixFollowingOptionalMessage)
						}
					}
					if (schema.minVariadicLength && !schema.variadic) {
						return throwParseError(
							"minVariadicLength may not be specified without a variadic element"
						)
					}
					return schema
				}
				return { variadic: schema }
			},
			reduce: (raw, $) => {
				let minVariadicLength = raw.minVariadicLength ?? 0
				const prefix = raw.prefix?.slice() ?? []
				const optionals = raw.optionals?.slice() ?? []
				const postfix = raw.postfix?.slice() ?? []
				if (raw.variadic) {
					// optional elements equivalent to the variadic parameter are redundant
					while (optionals.at(-1)?.equals(raw.variadic)) {
						optionals.pop()
					}

					if (optionals.length === 0) {
						// If there are no optionals, normalize prefix
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
				} else if (optionals.length === 0) {
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
					// reparse the reduced schema
					return $.parsePrereducedSchema("sequence", {
						...raw,
						// empty lists will be omitted during parsing
						prefix,
						postfix,
						optionals: optionals as never,
						minVariadicLength
					})
				}
			},
			defaults: {
				description(node) {
					if (node.isVariadicOnly)
						return `${node.variadic!.nestableExpression}[]`
					return (
						"[" +
						node.tuple
							.map((element) =>
								element.kind === "prefix"
									? `${element.node}`
									: element.kind === "optionals"
									? `${element.node.nestableExpression}?`
									: element.kind === "variadic"
									? `...${element.node.nestableExpression}[]`
									: `${element.node}`
							)
							.join(", ") +
						"]"
					)
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
						? $.parseSchema(
								"sequence",
								sequenceTupleToInner(viableBranches[0].result)
						  )
						: $.parseSchema(
								"union",
								viableBranches.map((state) => ({
									proto: Array,
									sequence: sequenceTupleToInner(state.result)
								}))
						  )
				}
				// length, minLength, and maxLength don't need to be defined
				// here since impliedSiblings guarantees they will be added
				// directly to the IntersectionNode parent of the SequenceNode
				// they exist on
			}
		})

	readonly impliedBasis = this.$.jsObjects.Array
	readonly prefix = this.inner.prefix ?? []
	readonly optionals = this.inner.optionals ?? []
	readonly prevariadic = [...this.prefix, ...this.optionals]
	readonly postfix = this.inner.postfix ?? []
	readonly isVariadicOnly = this.prevariadic.length + this.postfix.length === 0
	readonly minVariadicLength = this.inner.minVariadicLength ?? 0
	readonly minLength =
		this.prefix.length + this.minVariadicLength + this.postfix.length
	readonly minLengthNode =
		this.minLength === 0
			? undefined
			: this.$.parseSchema("minLength", this.minLength)
	readonly maxLength = this.variadic
		? undefined
		: this.minLength + this.optionals.length
	readonly maxLengthNode =
		this.maxLength === undefined
			? undefined
			: this.$.parseSchema("maxLength", this.maxLength)
	readonly impliedSiblings = this.minLengthNode
		? this.maxLengthNode
			? [this.minLengthNode, this.maxLengthNode]
			: [this.minLengthNode]
		: this.maxLengthNode
		? [this.maxLengthNode]
		: undefined

	protected childAtIndex(data: List, index: number): Type {
		if (index < this.prevariadic.length) return this.prevariadic[index]
		const postfixStartIndex = data.length - this.postfix.length
		if (index >= postfixStartIndex)
			return this.postfix[index - postfixStartIndex]
		return (
			this.variadic ??
			throwInternalError(
				`Unexpected attempt to access index ${index} on ${this}`
			)
		)
	}

	// minLength/maxLength should be checked by Intersection before either traversal
	traverseAllows: TraverseAllows<List> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (!this.childAtIndex(data, i).traverseAllows(data[i], ctx)) {
				return false
			}
		}
		return true
	}

	traverseApply: TraverseApply<List> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			this.childAtIndex(data, i).traverseApply(data[i], ctx)
		}
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		this.prefix.forEach((node, i) => js.checkReferenceKey(`${i}`, node))
		this.optionals.forEach((node, i) => {
			const dataIndex = `${i + this.prefix.length}`
			js.if(`${dataIndex} >= ${js.data}.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
			js.checkReferenceKey(dataIndex, node)
		})

		if (this.variadic) {
			js.const(
				"lastVariadicIndex",
				`${js.data}.length${this.postfix ? `- ${this.postfix.length}` : ""}`
			)
			js.for(
				"i < lastVariadicIndex",
				() => js.checkReferenceKey("i", this.variadic!),
				this.prevariadic.length
			)
			this.postfix.forEach((node, i) =>
				js.checkReferenceKey(`lastVariadicIndex + ${i + 1}`, node)
			)
		}

		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}

	readonly tuple = sequenceInnerToTuple(this.inner)
	// this depends on tuple so needs to come after it
	readonly expression = this.description
}

const sequenceInnerToTuple = (inner: SequenceInner): SequenceTuple => {
	const tuple: mutable<SequenceTuple> = []
	inner.prefix?.forEach((node) => tuple.push({ kind: "prefix", node }))
	inner.optionals?.forEach((node) => tuple.push({ kind: "optionals", node }))
	if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
	inner.postfix?.forEach((node) => tuple.push({ kind: "postfix", node }))
	return tuple
}

const sequenceTupleToInner = (tuple: SequenceTuple): SequenceInner =>
	tuple.reduce<MutableInner<"sequence">>((result, el) => {
		if (el.kind === "variadic") {
			result.variadic = el.node
		} else {
			result[el.kind] = append(result[el.kind], el.node)
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
	"prefix" | "optionals" | "variadic" | "postfix"
>

export type SequenceElement = {
	kind: SequenceElementKind
	node: Type
}
export type SequenceTuple = List<SequenceElement>

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
			: lHead.kind === "optionals" || rHead.kind === "optionals"
			? // if either operand has postfix elements, the full-length
			  // intersection can't include optional elements (though they may
			  // exist in some of the fixed length variants)
			  lHasPostfix || rHasPostfix
				? "prefix"
				: "optionals"
			: lHead.kind === "postfix" || rHead.kind === "postfix"
			? "postfix"
			: "variadic"

	if (lHead.kind === "prefix" && rHead.kind === "variadic" && rHasPostfix) {
		const postfixBranchResult = intersectSequences({
			...state,
			fixedVariants: [],
			r: rTail.map((element) => ({ ...element, kind: "prefix" }))
		})
		if (!postfixBranchResult.disjoint) {
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
		if (!postfixBranchResult.disjoint) {
			state.fixedVariants.push(postfixBranchResult)
		}
	}

	const result = lHead.node.intersect(rHead.node)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			state.disjoint.add(
				result.withPrefixKey(
					// TODO: more precise path handling for Disjoints
					kind === "prefix" ? `${state.result.length}` : `-${lTail.length + 1}`
				)
			)
			state.result = [
				...state.result,
				{ kind, node: lHead.node.$.tsKeywords.never as never }
			]
		} else if (kind === "optionals") {
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
