import {
	append,
	throwInternalError,
	throwParseError,
	type array,
	type mutable,
	type satisfy
} from "@arktype/util"
import { BaseConstraint } from "../constraint.js"
import type { MutableInner, RootSchema } from "../kinds.js"
import {
	appendUniqueContextualReferences,
	contextualReference,
	type ContextualReference,
	type DeepNodeTransformContext,
	type DeepNodeTransformation
} from "../node.js"
import type { MaxLengthNode } from "../refinements/maxLength.js"
import type { MinLengthNode } from "../refinements/minLength.js"
import type { BaseRoot } from "../roots/root.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type IntersectionContext,
	type NodeKeyImplementation,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"

export interface NormalizedSequenceSchema extends BaseMeta {
	readonly prefix?: array<RootSchema>
	readonly optionals?: array<RootSchema>
	readonly variadic?: RootSchema
	readonly minVariadicLength?: number
	readonly postfix?: array<RootSchema>
}

export type SequenceSchema = NormalizedSequenceSchema | RootSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: array<BaseRoot>
	// a list of optional elements following prefix
	readonly optionals?: array<BaseRoot>
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: BaseRoot
	readonly minVariadicLength?: number
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: array<BaseRoot>
}

export interface SequenceDeclaration
	extends declareNode<{
		kind: "sequence"
		schema: SequenceSchema
		normalizedSchema: NormalizedSequenceSchema
		inner: SequenceInner
		prerequisite: array
		reducibleTo: "sequence"
		childKind: RootKind
	}> {}

const fixedSequenceKeySchemaDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optionals"
> = {
	child: true,
	parse: (schema, ctx) =>
		schema.length === 0 ?
			// empty affixes are omitted. an empty array should therefore
			// be specified as `{ proto: Array, length: 0 }`
			undefined
		:	schema.map(element => ctx.$.schema(element))
}

export const sequenceImplementation: nodeImplementationOf<SequenceDeclaration> =
	implementNode<SequenceDeclaration>({
		kind: "sequence",
		hasAssociatedError: false,
		collapsibleKey: "variadic",
		keys: {
			prefix: fixedSequenceKeySchemaDefinition,
			optionals: fixedSequenceKeySchemaDefinition,
			variadic: {
				child: true,
				parse: (schema, ctx) => ctx.$.schema(schema, ctx)
			},
			minVariadicLength: {
				// minVariadicLength is reflected in the id of this node,
				// but not its IntersectionNode parent since it is superceded by the minLength
				// node it implies
				parse: min => (min === 0 ? undefined : min)
			},
			postfix: fixedSequenceKeySchemaDefinition
		},
		normalize: schema => {
			if (typeof schema === "string") return { variadic: schema }

			if (
				"variadic" in schema ||
				"prefix" in schema ||
				"optionals" in schema ||
				"postfix" in schema ||
				"minVariadicLength" in schema
			) {
				if (schema.postfix?.length) {
					if (!schema.variadic)
						return throwParseError(postfixWithoutVariadicMessage)

					if (schema.optionals?.length)
						return throwParseError(postfixFollowingOptionalMessage)
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
			const optional = raw.optionals?.slice() ?? []
			const postfix = raw.postfix?.slice() ?? []
			if (raw.variadic) {
				// optional elements equivalent to the variadic parameter are redundant
				while (optional.at(-1)?.equals(raw.variadic)) optional.pop()

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
						optionals: optional,
						minVariadicLength
					},
					{ prereduced: true }
				)
			}
		},
		defaults: {
			description: node => {
				if (node.isVariadicOnly) return `${node.variadic!.nestableExpression}[]`
				const innerDescription = node.tuple
					.map(element =>
						element.kind === "optionals" ? `${element.node.nestableExpression}?`
						: element.kind === "variadic" ?
							`...${element.node.nestableExpression}[]`
						:	element.node.expression
					)
					.join(", ")
				return `[${innerDescription}]`
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
					: viableBranches.length === 1 ?
						ctx.$.node(
							"sequence",
							sequenceTupleToInner(viableBranches[0].result)
						)
					:	ctx.$.node(
							"union",
							viableBranches.map(state => ({
								proto: Array,
								sequence: sequenceTupleToInner(state.result)
							}))
						)
				)
			}

			// exactLength, minLength, and maxLength don't need to be defined
			// here since impliedSiblings guarantees they will be added
			// directly to the IntersectionNode parent of the SequenceNode
			// they exist on
		}
	})

export class SequenceNode extends BaseConstraint<SequenceDeclaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.Array
	prefix: array<BaseRoot> = this.inner.prefix ?? []
	optionals: array<BaseRoot> = this.inner.optionals ?? []
	prevariadic: BaseRoot[] = [...this.prefix, ...this.optionals]
	postfix: array<BaseRoot> = this.inner.postfix ?? []
	isVariadicOnly: boolean = this.prevariadic.length + this.postfix.length === 0
	minVariadicLength: number = this.inner.minVariadicLength ?? 0
	minLength: number =
		this.prefix.length + this.minVariadicLength + this.postfix.length
	minLengthNode: MinLengthNode | null =
		this.minLength === 0 ? null : this.$.node("minLength", this.minLength)
	maxLength: number | null =
		this.variadic ? null : this.minLength + this.optionals.length
	maxLengthNode: MaxLengthNode | null =
		this.maxLength === null ? null : this.$.node("maxLength", this.maxLength)
	impliedSiblings: array<MaxLengthNode | MinLengthNode> =
		this.minLengthNode ?
			this.maxLengthNode ?
				[this.minLengthNode, this.maxLengthNode]
			:	[this.minLengthNode]
		: this.maxLengthNode ? [this.maxLengthNode]
		: []

	protected childAtIndex(data: array, index: number): BaseRoot {
		if (index < this.prevariadic.length) return this.prevariadic[index]
		const firstPostfixIndex = data.length - this.postfix.length
		if (index >= firstPostfixIndex)
			return this.postfix[index - firstPostfixIndex]
		return (
			this.variadic ??
			throwInternalError(
				`Unexpected attempt to access index ${index} on ${this}`
			)
		)
	}

	// minLength/maxLength should be checked by Intersection before either traversal
	traverseAllows: TraverseAllows<array> = (data, ctx) => {
		for (let i = 0; i < data.length; i++)
			if (!this.childAtIndex(data, i).traverseAllows(data[i], ctx)) return false

		return true
	}

	traverseApply: TraverseApply<array> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			ctx.path.push(i)
			this.childAtIndex(data, i).traverseApply(data[i], ctx)
			ctx.path.pop()
		}
	}

	override get contextualReferences() {
		const refs: ContextualReference[] = []

		appendUniqueContextualReferences(
			refs,
			this.prevariadic.flatMap((n, i) =>
				n.contextualReferences.map(ref =>
					contextualReference([`${i}`, ...ref.path], ref.node)
				)
			)
		)

		if (this.variadic) {
			appendUniqueContextualReferences(
				refs,
				this.variadic.contextualReferences.map(ref =>
					contextualReference(
						[$ark.intrinsic.nonNegativeIntegerString, ...ref.path],
						ref.node
					)
				)
			)
		}

		appendUniqueContextualReferences(
			refs,
			this.postfix.flatMap(n =>
				// a postfix index can't be directly represented as a type
				// key, so we just use the same matcher for variadic
				n.contextualReferences.map(ref =>
					contextualReference(
						[$ark.intrinsic.nonNegativeIntegerString, ...ref.path],
						ref.node
					)
				)
			)
		)

		return refs
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		this.prefix.forEach((node, i) => js.traverseKey(`${i}`, `data[${i}]`, node))
		this.optionals.forEach((node, i) => {
			const dataIndex = `${i + this.prefix.length}`
			js.if(`${dataIndex} >= ${js.data}.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
			js.traverseKey(dataIndex, `data[${dataIndex}]`, node)
		})

		if (this.variadic) {
			if (this.postfix.length) {
				js.const(
					"firstPostfixIndex",
					`${js.data}.length${this.postfix.length ? `- ${this.postfix.length}` : ""}`
				)
			}
			js.for(
				`i < ${this.postfix.length ? "firstPostfixIndex" : "data.length"}`,
				() => js.traverseKey("i", "data[i]", this.variadic!),
				this.prevariadic.length
			)
			this.postfix.forEach((node, i) => {
				const keyExpression = `firstPostfixIndex + ${i}`
				js.traverseKey(keyExpression, `data[${keyExpression}]`, node)
			})
		}

		if (js.traversalKind === "Allows") js.return(true)
	}

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	) {
		ctx.path.push($ark.intrinsic.nonNegativeIntegerString)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	tuple: SequenceTuple = sequenceInnerToTuple(this.inner)
	// this depends on tuple so needs to come after it
	expression: string = this.description
}

const sequenceInnerToTuple = (inner: SequenceInner): SequenceTuple => {
	const tuple: mutable<SequenceTuple> = []
	inner.prefix?.forEach(node => tuple.push({ kind: "prefix", node }))
	inner.optionals?.forEach(node => tuple.push({ kind: "optionals", node }))
	if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
	inner.postfix?.forEach(node => tuple.push({ kind: "postfix", node }))
	return tuple
}

const sequenceTupleToInner = (tuple: SequenceTuple): SequenceInner =>
	tuple.reduce<MutableInner<"sequence">>((result, node) => {
		if (node.kind === "variadic") result.variadic = node.node
		else result[node.kind] = append(result[node.kind], node.node)

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
	node: BaseRoot
}
export type SequenceTuple = array<SequenceElement>

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

	const lHasPostfix = lTail.at(-1)?.kind === "postfix"
	const rHasPostfix = rTail.at(-1)?.kind === "postfix"

	const kind: SequenceElementKind =
		lHead.kind === "prefix" || rHead.kind === "prefix" ? "prefix"
		: lHead.kind === "optionals" || rHead.kind === "optionals" ?
			// if either operand has postfix elements, the full-length
			// intersection can't include optional elements (though they may
			// exist in some of the fixed length variants)
			lHasPostfix || rHasPostfix ?
				"prefix"
			:	"optionals"
		: lHead.kind === "postfix" || rHead.kind === "postfix" ? "postfix"
		: "variadic"

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

	const result = intersectNodes(lHead.node, rHead.node, s.ctx)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			s.disjoint.push(
				...result.withPrefixKey(
					// TODO: more precise path handling for Disjoints
					kind === "prefix" ? `${s.result.length}` : `-${lTail.length + 1}`,
					"required"
				)
			)
			s.result = [...s.result, { kind, node: $ark.intrinsic.never.internal }]
		} else if (kind === "optionals") {
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
