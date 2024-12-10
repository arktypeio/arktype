import {
	append,
	conflatenate,
	throwInternalError,
	throwParseError,
	type array,
	type mutable,
	type satisfy
} from "@ark/util"
import { BaseConstraint } from "../constraint.ts"
import type { RootSchema, mutableInnerOfKind } from "../kinds.ts"
import {
	appendUniqueFlatRefs,
	flatRef,
	type BaseNode,
	type DeepNodeTransformContext,
	type DeepNodeTransformation,
	type FlatRef
} from "../node.ts"
import type { ExactLengthNode } from "../refinements/exactLength.ts"
import type { MaxLengthNode } from "../refinements/maxLength.ts"
import type { MinLengthNode } from "../refinements/minLength.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type IntersectionContext,
	type RootKind,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { intersectOrPipeNodes } from "../shared/intersections.ts"
import {
	writeUnsupportedJsonSchemaTypeMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import {
	traverseKey,
	type TraverseAllows,
	type TraverseApply
} from "../shared/traversal.ts"
import { assertDefaultValueAssignability } from "./optional.ts"

export declare namespace Sequence {
	export interface NormalizedSchema extends BaseNormalizedSchema {
		readonly prefix?: array<RootSchema>
		readonly optionals?: array<RootSchema>
		readonly defaults?: array
		readonly variadic?: RootSchema
		readonly minVariadicLength?: number
		readonly postfix?: array<RootSchema>
	}

	export type Schema = NormalizedSchema | RootSchema

	export interface Inner {
		// a list of fixed position elements starting at index 0
		readonly prefix?: array<BaseRoot>
		// a list of optional elements following prefix
		readonly optionals?: array<BaseRoot>
		// a list of default values associated with the optional elements
		// at the corresponding indices
		readonly defaults?: array
		// the variadic element (only checked if all optional elements are present)
		readonly variadic?: BaseRoot
		readonly minVariadicLength?: number
		// a list of fixed position elements, the last being the last element of the array
		readonly postfix?: array<BaseRoot>
	}

	export interface Declaration
		extends declareNode<{
			kind: "sequence"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			prerequisite: array
			reducibleTo: "sequence"
			childKind: RootKind
		}> {}

	export type Node = SequenceNode
}

const defaultsWithoutOptionalsMessage =
	"'defaults' specifies values for optional elements at corresponding indices and cannot be present without an 'optionals' key."

const tooManyDefaultsMessage =
	"'defaults' specifies values for optional elements at corresponding indices and must have length less than or equal that of 'optionals'."

const implementation: nodeImplementationOf<Sequence.Declaration> =
	implementNode<Sequence.Declaration>({
		kind: "sequence",
		hasAssociatedError: false,
		collapsibleKey: "variadic",
		keys: {
			prefix: {
				child: true,
				parse: (schema, ctx) => {
					// empty affixes are omitted. an empty array should therefore
					// be specified as `{ proto: Array, length: 0 }`
					if (schema.length === 0) return undefined

					return schema.map(element => ctx.$.parseSchema(element))
				}
			},
			optionals: {
				child: true,
				parse: (schema, ctx) => {
					if (schema.length === 0) return undefined

					const nodes = schema.map(element => ctx.$.parseSchema(element))

					ctx.def.defaults?.forEach((defaultValue, i) => {
						if (i > nodes.length - 1) throwParseError(tooManyDefaultsMessage)
						assertDefaultValueAssignability(nodes[i], defaultValue)
					})

					return nodes
				}
			},
			defaults: {
				parse: (defaults, ctx) => {
					if (!ctx.def.optionals)
						throwParseError(defaultsWithoutOptionalsMessage)
					// remaining validation handled by optionals so that we can
					// instantiate the nodes first
					return defaults
				}
			},
			variadic: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseSchema(schema, ctx)
			},
			minVariadicLength: {
				// minVariadicLength is reflected in the id of this node,
				// but not its IntersectionNode parent since it is superceded by the minLength
				// node it implies
				parse: min => (min === 0 ? undefined : min)
			},
			postfix: {
				child: true,
				parse: (schema, ctx) => {
					if (schema.length === 0) return undefined

					return schema.map(element => ctx.$.parseSchema(element))
				}
			}
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

export class SequenceNode extends BaseConstraint<Sequence.Declaration> {
	impliedBasis: BaseRoot = $ark.intrinsic.Array.internal

	prefixLength: number = this.prefix?.length ?? 0
	optionalsLength: number = this.optionals?.length ?? 0
	postfixLength: number = this.postfix?.length ?? 0
	prevariadic: array<BaseRoot> = conflatenate(this.prefix, this.optionals)

	variadicOrPostfix: array<BaseRoot> = conflatenate(
		this.variadic && [this.variadic],
		this.postfix
	)

	isVariadicOnly: boolean = this.prevariadic.length + this.postfixLength === 0
	minVariadicLength: number = this.inner.minVariadicLength ?? 0
	minLength: number =
		this.prefixLength + this.minVariadicLength + this.postfixLength
	minLengthNode: MinLengthNode | null =
		this.minLength === 0 ?
			null
			// cast is safe here as the only time this would not be a
			// MinLengthNode would be when minLength is 0
		:	(this.$.node("minLength", this.minLength) as never)
	maxLength: number | null =
		this.variadic ? null : this.minLength + this.optionalsLength
	maxLengthNode: MaxLengthNode | ExactLengthNode | null =
		this.maxLength === null ? null : this.$.node("maxLength", this.maxLength)
	impliedSiblings: array<MaxLengthNode | MinLengthNode | ExactLengthNode> =
		this.minLengthNode ?
			this.maxLengthNode ?
				[this.minLengthNode, this.maxLengthNode]
			:	[this.minLengthNode]
		: this.maxLengthNode ? [this.maxLengthNode]
		: []

	protected childAtIndex(data: array, index: number): BaseRoot {
		if (index < this.prevariadic.length) return this.prevariadic[index]
		const firstPostfixIndex = data.length - this.postfixLength
		if (index >= firstPostfixIndex)
			return this.postfix![index - firstPostfixIndex]
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
			traverseKey(
				i,
				() => this.childAtIndex(data, i).traverseApply(data[i], ctx),
				ctx
			)
		}
	}

	override get flatRefs(): FlatRef[] {
		const refs: FlatRef[] = []

		appendUniqueFlatRefs(
			refs,
			this.prevariadic.flatMap((element, i) =>
				append(
					element.flatRefs.map(ref => flatRef([`${i}`, ...ref.path], ref.node)),
					flatRef([`${i}`], element)
				)
			)
		)

		appendUniqueFlatRefs(
			refs,
			this.variadicOrPostfix.flatMap(element =>
				// a postfix index can't be directly represented as a type
				// key, so we just use the same matcher for variadic
				append(
					element.flatRefs.map(ref =>
						flatRef(
							[$ark.intrinsic.nonNegativeIntegerString.internal, ...ref.path],
							ref.node
						)
					),
					flatRef([$ark.intrinsic.nonNegativeIntegerString.internal], element)
				)
			)
		)

		return refs
	}

	get element(): BaseRoot {
		return this.cacheGetter("element", this.$.node("union", this.children))
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		this.prefix?.forEach((node, i) =>
			js.traverseKey(`${i}`, `data[${i}]`, node)
		)
		this.optionals?.forEach((node, i) => {
			const dataIndex = `${i + this.prefixLength}`
			js.if(`${dataIndex} >= ${js.data}.length`, () =>
				js.traversalKind === "Allows" ? js.return(true) : js.return()
			)
			js.traverseKey(dataIndex, `data[${dataIndex}]`, node)
		})

		if (this.variadic) {
			if (this.postfix) {
				js.const(
					"firstPostfixIndex",
					`${js.data}.length${this.postfix ? `- ${this.postfix.length}` : ""}`
				)
			}
			js.for(
				`i < ${this.postfix ? "firstPostfixIndex" : "data.length"}`,
				() => js.traverseKey("i", "data[i]", this.variadic!),
				this.prevariadic.length
			)
			this.postfix?.forEach((node, i) => {
				const keyExpression = `firstPostfixIndex + ${i}`
				js.traverseKey(keyExpression, `data[${keyExpression}]`, node)
			})
		}

		if (js.traversalKind === "Allows") js.return(true)
	}

	protected override _transform(
		mapper: DeepNodeTransformation,
		ctx: DeepNodeTransformContext
	): BaseNode | null {
		ctx.path.push($ark.intrinsic.nonNegativeIntegerString.internal)
		const result = super._transform(mapper, ctx)
		ctx.path.pop()
		return result
	}

	tuple: SequenceTuple = sequenceInnerToTuple(this.inner)
	// this depends on tuple so needs to come after it
	expression: string = this.description

	reduceJsonSchema(schema: JsonSchema.Array): JsonSchema.Array {
		if (this.prefix)
			schema.prefixItems = this.prefix.map(node => node.toJsonSchema())

		if (this.optionals) {
			throwParseError(
				writeUnsupportedJsonSchemaTypeMessage(
					`Optional tuple element${this.optionalsLength > 1 ? "s" : ""} ${this.optionals.join(", ")}`
				)
			)
		}

		if (this.variadic) {
			schema.items = this.variadic?.toJsonSchema()
			// length constraints will be enforced by items: false
			// for non-variadic arrays
			if (this.minLength) schema.minItems = this.minLength
			if (this.maxLength) schema.maxItems = this.maxLength
		} else {
			schema.items = false
			// delete min/maxLength constraints that will have been added by the
			// base intersection node to enforce fixed length
			delete schema.minItems
			delete schema.maxItems
		}

		if (this.postfix) {
			throwParseError(
				writeUnsupportedJsonSchemaTypeMessage(
					`Postfix tuple element${this.postfixLength > 1 ? "s" : ""} ${this.postfix.join(", ")}`
				)
			)
		}

		return schema
	}
}

export const Sequence = {
	implementation,
	Node: SequenceNode
}

const sequenceInnerToTuple = (inner: Sequence.Inner): SequenceTuple => {
	const tuple: mutable<SequenceTuple> = []
	inner.prefix?.forEach(node => tuple.push({ kind: "prefix", node }))
	inner.optionals?.forEach(node => tuple.push({ kind: "optionals", node }))
	if (inner.variadic) tuple.push({ kind: "variadic", node: inner.variadic })
	inner.postfix?.forEach(node => tuple.push({ kind: "postfix", node }))
	return tuple
}

const sequenceTupleToInner = (tuple: SequenceTuple): Sequence.Inner =>
	tuple.reduce<mutableInnerOfKind<"sequence">>((result, node) => {
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
	keyof Sequence.Inner,
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

	const result = intersectOrPipeNodes(lHead.node, rHead.node, s.ctx)
	if (result instanceof Disjoint) {
		if (kind === "prefix" || kind === "postfix") {
			s.disjoint.push(
				...result.withPrefixKey(
					// ideally we could handle disjoint paths more precisely here,
					// but not trivial to serialize postfix elements as keys
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
