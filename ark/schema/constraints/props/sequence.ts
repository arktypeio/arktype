import {
	append,
	throwInternalError,
	throwParseError,
	type array,
	type mutable,
	type satisfy
} from "@arktype/util"
import { implementNode, type Schema, type SchemaDef } from "../../base.js"
import { jsObjects } from "../../keywords/jsObjects.js"
import { tsKeywords } from "../../keywords/tsKeywords.js"
import type { MutableInner } from "../../kinds.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type {
	NodeKeyImplementation,
	SchemaKind,
	nodeImplementationOf
} from "../../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../../shared/traversal.js"
import { BaseConstraint } from "../constraint.js"

export interface NormalizedSequenceDef extends BaseMeta {
	readonly prefix?: readonly SchemaDef[]
	readonly optional?: readonly SchemaDef[]
	readonly variadic?: SchemaDef
	readonly minVariadicLength?: number
	readonly postfix?: readonly SchemaDef[]
}

export type SequenceDef = NormalizedSequenceDef | SchemaDef

export interface SequenceInner extends BaseMeta {
	// a list of fixed position elements starting at index 0
	readonly prefix?: readonly Schema[]
	// a list of optional elements following prefix
	readonly optional?: readonly Schema[]
	// the variadic element (only checked if all optional elements are present)
	readonly variadic?: Schema
	readonly minVariadicLength?: number
	// a list of fixed position elements, the last being the last element of the array
	readonly postfix?: readonly Schema[]
}

export type SequenceDeclaration = declareNode<{
	kind: "sequence"
	def: SequenceDef
	normalizedDef: NormalizedSequenceDef
	inner: SequenceInner
	prerequisite: array
	reducibleTo: "sequence"
	childKind: SchemaKind
}>

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
			if (node.isVariadicOnly) return `${node.variadic!.nestableExpression}[]`
			return (
				"[" +
				node.tuple
					.map((element) =>
						element.kind === "optional"
							? `${element.node.nestableExpression}?`
							: element.kind === "variadic"
							? `...${element.node.nestableExpression}[]`
							: element.node.expression
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
				? $.node("sequence", sequenceTupleToInner(viableBranches[0].result))
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
	}
})

export class SequenceNode extends BaseConstraint<SequenceDeclaration> {
	static implementation: nodeImplementationOf<SequenceDeclaration> =
		sequenceImplementation

	readonly impliedBasis = jsObjects.Array
	readonly prefix = this.inner.prefix ?? []
	readonly optional = this.inner.optional ?? []
	readonly prevariadic = [...this.prefix, ...this.optional]
	readonly postfix = this.inner.postfix ?? []
	readonly isVariadicOnly = this.prevariadic.length + this.postfix.length === 0
	readonly minVariadicLength = this.inner.minVariadicLength ?? 0
	readonly minLength =
		this.prefix.length + this.minVariadicLength + this.postfix.length
	readonly minLengthNode =
		this.minLength === 0 ? undefined : this.$.node("minLength", this.minLength)
	readonly maxLength = this.variadic
		? undefined
		: this.minLength + this.optional.length
	readonly maxLengthNode =
		this.maxLength === undefined
			? undefined
			: this.$.node("maxLength", this.maxLength)
	readonly impliedSiblings = this.minLengthNode
		? this.maxLengthNode
			? [this.minLengthNode, this.maxLengthNode]
			: [this.minLengthNode]
		: this.maxLengthNode
		? [this.maxLengthNode]
		: undefined

	protected childAtIndex(data: array, index: number): Schema {
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
	traverseAllows: TraverseAllows<array> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			if (!this.childAtIndex(data, i).traverseAllows(data[i], ctx)) {
				return false
			}
		}
		return true
	}

	traverseApply: TraverseApply<array> = (data, ctx) => {
		for (let i = 0; i < data.length; i++) {
			ctx.path.push(i)
			this.childAtIndex(data, i).traverseApply(data[i], ctx)
			ctx.path.pop()
		}
	}

	// minLength/maxLength compilation should be handled by Intersection
	compile(js: NodeCompiler): void {
		this.prefix.forEach((node, i) => js.checkReferenceKey(`${i}`, node))
		this.optional.forEach((node, i) => {
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
	node: Schema
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
					kind === "prefix" ? `${state.result.length}` : `-${lTail.length + 1}`
				)
			)
			state.result = [
				...state.result,
				{ kind, node: tsKeywords.never as never }
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
