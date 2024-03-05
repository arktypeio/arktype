import {
	append,
	throwInternalError,
	throwParseError,
	type List,
	type mutable
} from "@arktype/util"
import type { TypeNode, TypeSchema } from "../../base.js"
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
import { BaseConstraint } from "../constraint.js"

export interface BaseSequenceSchema extends BaseMeta {
	readonly prefix?: readonly TypeSchema[]
	readonly variadic?: TypeSchema
}

export interface NormalizedPostfixableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: undefined
	// variadic is required for postfix
	readonly variadic: TypeSchema
	readonly postfix?: readonly TypeSchema[]
}

export interface NormalizedOptionalizableSequenceSchema
	extends BaseSequenceSchema {
	readonly optionals?: readonly TypeSchema[]
	readonly postfix?: undefined
}

export type NormalizedSequenceSchema =
	| NormalizedPostfixableSequenceSchema
	| NormalizedOptionalizableSequenceSchema

export type SequenceSchema = NormalizedSequenceSchema | TypeSchema

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: readonly TypeNode[]
	// a list of optional elements following prefix
	readonly optionals?: readonly TypeNode[]
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: TypeNode
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: readonly TypeNode[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	schema: SequenceSchema
	normalizedSchema: NormalizedSequenceSchema
	inner: SequenceInner
	composition: "composite"
	prerequisite: List
	reducibleTo: "sequence"
	hasBranchableIntersection: true
	childKind: TypeKind
}>

const fixedSequenceKeyDefinition: NodeKeyImplementation<
	SequenceDeclaration,
	"prefix" | "postfix" | "optionals"
> = {
	child: true,
	// TODO: figure out fixed []
	parse: (schema, ctx) =>
		schema.length === 0
			? // omit empty affixes
			  undefined
			: schema.map((element) => ctx.$.parseTypeNode(element))
}

export class SequenceNode extends BaseConstraint<
	SequenceDeclaration,
	typeof SequenceNode
> {
	static implementation: nodeImplementationOf<SequenceDeclaration> =
		this.implement({
			hasAssociatedError: false,
			collapseKey: "variadic",
			keys: {
				prefix: fixedSequenceKeyDefinition,
				optionals: fixedSequenceKeyDefinition,
				variadic: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeNode(schema)
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
					"postfix" in schema
				) {
					if (schema.postfix?.length) {
						if (!schema.variadic) {
							return throwParseError(postfixWithoutVariadicMessage)
						}
						if ((schema.optionals as any)?.length) {
							return throwParseError(postfixFollowingOptionalMessage)
						}
					}
					return schema
				}
				return { variadic: schema }
			},
			reduce: (inner, $) => {
				if (!inner.postfix && !inner.optionals) {
					return
				}
				const fixed = inner.prefix?.slice() ?? []
				const optionals = inner.optionals?.slice() ?? []
				const postfix = inner.postfix?.slice() ?? []
				if (inner.variadic) {
					// optional elements equivalent to the variadic parameter are redundant
					while (optionals.at(-1)?.equals(inner.variadic)) {
						optionals.pop()
					}
				}
				if (optionals.length === 0) {
					if (inner.variadic) {
						// if optional length is 0, normalize equivalent
						// prefix/postfix elements to prefix, e.g.:
						// [...number[], number] => [number, ...number[]]
						while (postfix[0]?.equals(inner.variadic)) {
							fixed.push(postfix.shift()!)
						}
					} else {
						// if there's no variadic or optional parameters,
						// postfix can just be appended to fixed
						fixed.push(...postfix.splice(0))
					}
				}
				if (
					(inner.postfix && postfix.length < inner.postfix.length) ||
					(inner.optionals && optionals.length < inner.optionals.length)
				) {
					return $.parse(
						"sequence",
						{
							...inner,
							// empty lists will be omitted during parsing
							prefix: fixed,
							postfix,
							optionals: optionals as never
						},
						{ prereduced: true }
					)
				}
			},
			defaults: {
				description(inner) {
					const parts = inner.prefix?.map(String) ?? []
					inner.optionals?.forEach((node) => parts.push(`an optional ${node}`))
					if (inner.variadic) {
						parts.push(`zero or more ${inner.variadic} elements`)
					}
					inner.postfix?.forEach((node) => parts.push(String(node)))
					return `comprised of ${parts.join(" followed by ")}`
				}
			},
			intersections: {
				sequence: (l, r) => {
					const rootState = intersectSequences({
						l: l.tuple,
						r: r.tuple,
						disjoint: null,
						result: [],
						fixedVariants: []
					})

					const viableBranches = rootState.disjoint
						? rootState.fixedVariants
						: [rootState, ...rootState.fixedVariants]

					return viableBranches.length === 0
						? rootState.disjoint!
						: viableBranches.length === 1
						? sequenceTupleToInner(viableBranches[0].result)
						: viableBranches.map((state) => sequenceTupleToInner(state.result))
				},
				minLength: (l, r) => l.minLengthNode?.intersect(r) ?? null,
				maxLength: (l, r) => l.maxLengthNode?.intersect(r) ?? null
			}
		})

	readonly prefix = this.inner.prefix ?? []
	readonly optionals = this.inner.optionals ?? []
	readonly prevariadic = [...this.prefix, ...this.optionals]
	readonly postfix = this.inner.postfix ?? []
	readonly minLength = this.prefix.length + this.postfix.length
	readonly minLengthNode =
		this.minLength === 0 ? undefined : this.$.parse("minLength", this.minLength)
	readonly maxLength = this.variadic
		? undefined
		: this.minLength + this.optionals.length
	readonly maxLengthNode =
		this.maxLength === undefined
			? undefined
			: this.$.parse("maxLength", this.maxLength)

	protected childAtIndex(data: List, index: number) {
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
	compile(js: NodeCompiler) {
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

export type SequenceElementKind = Exclude<keyof SequenceInner, keyof BaseMeta>

export type SequenceElement = {
	kind: SequenceElementKind
	node: TypeNode
}
export type SequenceTuple = List<SequenceElement>

type SequenceIntersectionState = {
	l: SequenceTuple
	r: SequenceTuple
	disjoint: Disjoint | null
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
		if (kind === "optionals") {
			// if the element result is optional and unsatisfiable, the
			// intersection can still be satisfied as long as the tuple
			// ends before the disjoint element would occur
			return state
		} else {
			state.disjoint = result
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
