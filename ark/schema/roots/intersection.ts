import {
	append,
	appendUnique,
	conflatenateAll,
	isEmptyObject,
	omit,
	pick,
	throwInternalError,
	type array,
	type listable,
	type show
} from "@arktype/util"
import { constraintKeyParser, type BaseConstraint } from "../constraint.js"
import type {
	Inner,
	MutableInner,
	Node,
	NodeSchema,
	Prerequisite
} from "../kinds.js"
import type { BaseNode } from "../node.js"
import type { PredicateNode } from "../predicate.js"
import type { RawRootScope } from "../scope.js"
import type { NodeCompiler } from "../shared/compile.js"
import { metaKeys, type BaseMeta, type declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	constraintKeys,
	implementNode,
	structureKeys,
	type ConstraintKind,
	type IntersectionContext,
	type OpenNodeKind,
	type RefinementKind,
	type RootKind,
	type StructuralKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { hasArkKind, isNode } from "../shared/utils.js"
import {
	StructureGroup,
	type ExtraneousKeyBehavior,
	type StructureInner
} from "../structure/structure.js"
import type { DomainNode, DomainSchema } from "./domain.js"
import type { ProtoNode, ProtoSchema } from "./proto.js"
import { BaseRoot } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionChildKind = IntersectionBasisKind | ConstraintKind

export type RefinementsInner = {
	[k in RefinementKind]?: intersectionChildInnerValueOf<k>
}

export interface IntersectionInner
	extends BaseMeta,
		RefinementsInner,
		StructureInner {
	domain?: DomainNode
	proto?: ProtoNode
	predicate?: array<PredicateNode>
}

export type IntersectionSchema<inferredBasis = any> = show<
	BaseMeta & {
		domain?: DomainSchema
		proto?: ProtoSchema
	} & conditionalRootOf<inferredBasis>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	reducibleTo: "intersection" | IntersectionBasisKind
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
}>

export class IntersectionNode extends BaseRoot<IntersectionDeclaration> {
	basis: Node<IntersectionBasisKind> | null = this.domain ?? this.proto ?? null

	refinements: array<Node<RefinementKind>> = this.children.filter(
		(node): node is Node<RefinementKind> => node.isRefinement()
	)

	structure = maybeCreatePropsGroup(this.inner, this.$)

	traversables: array<
		Node<Exclude<IntersectionChildKind, StructuralKind>> | StructureGroup
	> = conflatenateAll<
		Node<Exclude<IntersectionChildKind, StructuralKind>> | StructureGroup
	>(this.basis, this.refinements, this.structure, this.predicate)

	expression: string =
		this.structure?.expression ||
		this.children.map(node => node.nestableExpression).join(" & ") ||
		"unknown"

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.traversables.every(traversable =>
			traversable.traverseAllows(data as never, ctx)
		)

	traverseApply: TraverseApply = (data, ctx) => {
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.hasError()) return
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				this.refinements[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.refinements.at(-1)!.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.structure) {
			this.structure.traverseApply(data as never, ctx)
			if (ctx.hasError()) return
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				this.predicate[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.hasError()) return
			}
			this.predicate.at(-1)!.traverseApply(data as never, ctx)
		}
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.traversables.forEach(traversable =>
				isNode(traversable) ? js.check(traversable) : traversable.compile(js)
			)
			js.return(true)
			return
		}

		const returnIfFail = () => js.if("ctx.hasError()", () => js.return())
		const returnIfFailFast = () =>
			js.if("ctx.failFast && ctx.hasError()", () => js.return())

		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.traversables.length > 1) returnIfFail()
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				js.check(this.refinements[i])
				returnIfFailFast()
			}
			js.check(this.refinements.at(-1)!)
			if (this.structure || this.predicate) returnIfFail()
		}
		if (this.structure) {
			this.structure.compile(js)
			if (this.predicate) returnIfFail()
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				js.check(this.predicate[i])
				// since predicates can be chained, we have to fail immediately
				// if one fails
				returnIfFail()
			}
			js.check(this.predicate.at(-1)!)
		}
	}

	rawKeyOf(): BaseRoot {
		return (
			this.basis ?
				this.structure ?
					this.basis.rawKeyOf().or(this.structure.keyof())
				:	this.basis.rawKeyOf()
			:	this.structure?.keyof() ?? this.$.keywords.never.raw
		)
	}
}

const intersectIntersections = (
	l: IntersectionInner,
	r: IntersectionInner,
	ctx: IntersectionContext
): BaseRoot | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (hasArkKind(l, "root") && l.hasKind("intersection"))
		return intersectIntersections(l.inner, r, ctx)
	if (hasArkKind(r, "root") && r.hasKind("intersection"))
		return intersectIntersections(l, r.inner, ctx)

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const basisResult =
		lBasis ?
			rBasis ?
				(intersectNodes(lBasis, rBasis, ctx) as Node<IntersectionBasisKind>)
			:	lBasis
		:	rBasis
	if (basisResult instanceof Disjoint) return basisResult

	const baseInner: IntersectionInner =
		basisResult ?
			{
				[basisResult.kind]: basisResult
			}
		:	{}

	return intersectConstraints({
		baseInner,
		l: flattenConstraints(l),
		r: flattenConstraints(r),
		roots: [],
		ctx
	})
}

export const intersectionImplementation: nodeImplementationOf<IntersectionDeclaration> =
	implementNode<IntersectionDeclaration>({
		kind: "intersection",
		hasAssociatedError: true,
		normalize: rawSchema => rawSchema,
		keys: {
			domain: {
				child: true,
				parse: (schema, ctx) => ctx.$.node("domain", schema)
			},
			proto: {
				child: true,
				parse: (schema, ctx) => ctx.$.node("proto", schema)
			},
			divisor: {
				child: true,
				parse: constraintKeyParser("divisor")
			},
			max: {
				child: true,
				parse: constraintKeyParser("max")
			},
			min: {
				child: true,
				parse: constraintKeyParser("min")
			},
			maxLength: {
				child: true,
				parse: constraintKeyParser("maxLength")
			},
			minLength: {
				child: true,
				parse: constraintKeyParser("minLength")
			},
			exactLength: {
				child: true,
				parse: constraintKeyParser("exactLength")
			},
			before: {
				child: true,
				parse: constraintKeyParser("before")
			},
			after: {
				child: true,
				parse: constraintKeyParser("after")
			},
			regex: {
				child: true,
				parse: constraintKeyParser("regex")
			},
			predicate: {
				child: true,
				parse: constraintKeyParser("predicate")
			},
			required: {
				child: true,
				parse: constraintKeyParser("required")
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional")
			},
			index: {
				child: true,
				parse: constraintKeyParser("index")
			},
			sequence: {
				child: true,
				parse: constraintKeyParser("sequence")
			},
			onExtraneousKey: {
				parse: behavior => (behavior === "ignore" ? undefined : behavior)
			}
		},
		// leverage reduction logic from intersection and identity to ensure initial
		// parse result is reduced
		reduce: (inner, $) =>
			// we cast union out of the result here since that only occurs when intersecting two sequences
			// that cannot occur when reducing a single intersection schema using unknown
			intersectIntersections({}, inner, {
				$,
				invert: false,
				pipe: false
			}) as Node<"intersection" | IntersectionBasisKind>,
		defaults: {
			description: node =>
				node.children.length === 0 ?
					"unknown"
				:	node.structure?.description ??
					node.children.map(child => child.description).join(" and "),
			expected: source =>
				`  • ${source.errors.map(e => e.expected).join("\n  • ")}`,
			problem: ctx => `must be...\n${ctx.expected}`
		},
		intersections: {
			intersection: (l, r, ctx) => {
				return intersectIntersections(l, r, ctx)
			},
			...defineRightwardIntersections("intersection", (l, r, ctx) => {
				// if l is unknown, return r
				if (l.children.length === 0) return r

				const basis = l.basis ? intersectNodes(l.basis, r, ctx) : r

				return (
					basis instanceof Disjoint ? basis
					: l?.basis?.equals(basis) ?
						// if the basis doesn't change, return the original intesection
						l
						// given we've already precluded l being unknown, the result must
						// be an intersection with the new basis result integrated
					:	l.$.node(
							"intersection",
							Object.assign(omit(l.inner, metaKeys), {
								[basis.kind]: basis
							}),
							{ prereduced: true }
						)
				)
			})
		}
	})

const maybeCreatePropsGroup = (inner: IntersectionInner, $: RawRootScope) => {
	const propsInput = pick(inner, structureKeys)
	return isEmptyObject(propsInput) ? null : new StructureGroup(propsInput, $)
}

interface ConstraintIntersectionState {
	baseInner: IntersectionInner
	l: BaseConstraint[]
	r: BaseConstraint[]
	roots: BaseRoot[]
	ctx: IntersectionContext
}

export const intersectConstraints = (
	s: ConstraintIntersectionState
): Node<RootKind> | Disjoint => {
	const head = s.r.shift()
	if (!head) {
		let result: BaseNode | Disjoint = s.ctx.$.node(
			"intersection",
			Object.assign(s.baseInner, unflattenConstraints(s.l)),
			{ prereduced: true }
		)

		for (const root of s.roots) {
			if (result instanceof Disjoint) return result

			result = intersectNodes(root, result, s.ctx)!
		}

		return result as never
	}
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isRoot()) s.roots.push(result)
			else s.l[i] = result as BaseConstraint
			matched = true
		} else if (!s.l.includes(result as never)) {
			return throwInternalError(
				`Unexpectedly encountered multiple distinct intersection results for refinement ${result}`
			)
		}
	}
	if (!matched) s.l.push(head)

	head.impliedSiblings?.forEach(node => appendUnique(s.r, node))
	return intersectConstraints(s)
}

export const flattenConstraints = (inner: object): BaseConstraint[] => {
	const result = Object.entries(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<BaseConstraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
			: l.innerHash < r.innerHash ? -1
			: 1
		)

	return result
}

// TODO: Fix type
export const unflattenConstraints = (
	constraints: array<BaseConstraint>
): IntersectionInner => {
	const inner: MutableInner<"intersection"> = {}
	for (const constraint of constraints) {
		if (constraint.hasOpenIntersection()) {
			inner[constraint.kind] = append(
				inner[constraint.kind],
				constraint
			) as never
		} else {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
}

export type ConditionalTerminalIntersectionRoot = {
	onExtraneousKey?: ExtraneousKeyBehavior
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionRoot

type ConditionalIntersectionKey =
	| ConstraintKind
	| ConditionalTerminalIntersectionKey

export type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? "onExtraneousKey" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildRootValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? listable<NodeSchema<k> | Inner<k>>
	:	NodeSchema<k> | Inner<k>

type conditionalRootValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind ? intersectionChildRootValueOf<k>
	:	ConditionalTerminalIntersectionRoot[k & ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

export type conditionalRootOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalRootValueOfKey<k>
}
