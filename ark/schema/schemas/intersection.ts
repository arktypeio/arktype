import {
	append,
	appendUnique,
	type array,
	conflatenateAll,
	entriesOf,
	flatMorph,
	hasDomain,
	isArray,
	isEmptyObject,
	type listable,
	type mutable,
	omit,
	type show,
	splitByKeys,
	throwInternalError
} from "@arktype/util"
import type { BaseConstraintNode } from "../constraints/constraint.js"
import type { PredicateNode } from "../constraints/predicate.js"
import type { PropKind } from "../constraints/structure/prop.js"
import type {
	ExtraneousKeyBehavior,
	ExtraneousKeyRestriction,
	StructureDef,
	StructureNode
} from "../constraints/structure/structure.js"
import type { Inner, MutableInner, NodeDef, Prerequisite } from "../kinds.js"
import type { Constraint, Node } from "../node.js"
import type { NodeParseContext } from "../parse.js"
import { RawSchema } from "../schema.js"
import type { NodeCompiler } from "../shared/compile.js"
import { type BaseMeta, type declareNode, metaKeys } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkTypeError } from "../shared/errors.js"
import {
	constraintKeys,
	type ConstraintKind,
	implementNode,
	type IntersectionChildKind,
	type IntersectionContext,
	type OpenNodeKind,
	type RefinementKind,
	structuralKeys,
	type StructuralKind
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { hasArkKind, isNode } from "../shared/utils.js"
import type { DomainDef, DomainNode } from "./domain.js"
import type { ProtoDef, ProtoNode } from "./proto.js"
import { defineRightwardIntersections } from "./utils.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = show<
	BaseMeta & {
		domain?: DomainNode
		proto?: ProtoNode
		structure?: StructureNode
		predicate?: array<PredicateNode>
	} & {
		[k in RefinementKind]?: intersectionChildInnerValueOf<k>
	}
>

export type NormalizedIntersectionDef = Omit<
	IntersectionDef,
	StructuralKind | "onExtraneousKey"
>

export type IntersectionDef<inferredBasis = any> = show<
	BaseMeta & {
		domain?: DomainDef
		proto?: ProtoDef
	} & conditionalSchemaOf<inferredBasis>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	def: IntersectionDef
	normalizedDef: NormalizedIntersectionDef
	inner: IntersectionInner
	reducibleTo: "intersection" | IntersectionBasisKind
	errorContext: {
		errors: readonly ArkTypeError[]
	}
	childKind: IntersectionChildKind
}>

export class IntersectionNode extends RawSchema<IntersectionDeclaration> {
	basis = this.domain ?? this.proto ?? null
	refinements = this.children.filter((node): node is Node<RefinementKind> =>
		node.isRefinement()
	)
	traversables = conflatenateAll<
		Node<Exclude<IntersectionChildKind, StructuralKind>> | StructureNode
	>(this.basis, this.refinements, this.structure, this.predicate)

	expression =
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

	rawKeyOf(): RawSchema {
		return (
			this.basis ?
				this.structure ?
					this.basis.rawKeyOf().or(this.structure.keyof())
				:	this.basis.rawKeyOf()
			:	this.structure?.keyof() ?? this.$.keywords.never.raw
		)
	}
}

export const intersectionChildKeyParser =
	<kind extends IntersectionChildKind>(kind: kind) =>
	(
		def: listable<NodeDef<kind>>,
		ctx: NodeParseContext
	): intersectionChildInnerValueOf<kind> | undefined => {
		if (isArray(def)) {
			if (def.length === 0) {
				// Omit empty lists as input
				return
			}
			return def
				.map(schema => ctx.$.node(kind, schema as never))
				.sort((l, r) => (l.innerHash < r.innerHash ? -1 : 1)) as never
		}
		const child = ctx.$.node(kind, def)
		return child.hasOpenIntersection() ? [child] : (child as any)
	}

const intersectIntersections = (
	reduced: IntersectionInner,
	raw: IntersectionInner,
	ctx: IntersectionContext
): RawSchema | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (hasArkKind(reduced, "schema") && reduced.hasKind("intersection"))
		return intersectIntersections(reduced.inner, raw, ctx)
	if (hasArkKind(raw, "schema") && raw.hasKind("intersection"))
		return intersectIntersections(reduced, raw.inner, ctx)

	const [reducedConstraintsInner, reducedRoot] = splitByKeys(
		reduced,
		constraintKeys
	)
	const [rawConstraintsInner, rawRoot] = splitByKeys(raw, constraintKeys)

	// since intersection with a left operand of unknown is leveraged for
	// reduction, check for the case where r is empty so we can preserve
	// metadata and save some time

	const root =
		isEmptyObject(reduced) ? rawRoot : (
			intersectRootKeys(reducedRoot, rawRoot, ctx)
		)

	if (root instanceof Disjoint) return root

	const lConstraints = flattenConstraints(reducedConstraintsInner)
	const rConstraints = flattenConstraints(rawConstraintsInner)

	const constraintResult = intersectConstraints({
		l: lConstraints,
		r: rConstraints,
		types: [],
		ctx
	})

	if (constraintResult instanceof Disjoint) return constraintResult

	let result: RawSchema | Disjoint = constraintResult.ctx.$.node(
		"intersection",
		Object.assign(root, unflattenConstraints(constraintResult.l)),
		{ prereduced: true }
	)

	for (const type of constraintResult.types) {
		if (result instanceof Disjoint) return result

		result = intersectNodes(type, result, constraintResult.ctx)
	}

	return result
}

export const intersectionImplementation =
	implementNode<IntersectionDeclaration>({
		kind: "intersection",
		hasAssociatedError: true,
		normalize: def => {
			const structure: mutable<StructureDef> = {}
			const normalized = flatMorph(def, (k, v) => {
				if (k in structuralKeys) {
					;(structure as any)[k] = v
					return []
				}
				return [k, v]
			}) as mutable<NormalizedIntersectionDef>
			if (!isEmptyObject(structure)) normalized.structure = structure
			return normalized
		},
		finalizeJson: ({ structure, ...rest }) =>
			hasDomain(structure, "object") ? { ...structure, ...rest } : rest,
		keys: {
			domain: {
				child: true,
				parse: intersectionChildKeyParser("domain")
			},
			proto: {
				child: true,
				parse: intersectionChildKeyParser("proto")
			},
			structure: {
				child: true,
				parse: intersectionChildKeyParser("structure")
			},
			divisor: {
				child: true,
				parse: intersectionChildKeyParser("divisor")
			},
			max: {
				child: true,
				parse: intersectionChildKeyParser("max")
			},
			min: {
				child: true,
				parse: intersectionChildKeyParser("min")
			},
			maxLength: {
				child: true,
				parse: intersectionChildKeyParser("maxLength")
			},
			minLength: {
				child: true,
				parse: intersectionChildKeyParser("minLength")
			},
			exactLength: {
				child: true,
				parse: intersectionChildKeyParser("exactLength")
			},
			before: {
				child: true,
				parse: intersectionChildKeyParser("before")
			},
			after: {
				child: true,
				parse: intersectionChildKeyParser("after")
			},
			regex: {
				child: true,
				parse: intersectionChildKeyParser("regex")
			},
			predicate: {
				child: true,
				parse: intersectionChildKeyParser("predicate")
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

type IntersectionRoot = Omit<IntersectionInner, ConstraintKind>

const intersectRootKeys = (
	l: IntersectionRoot,
	r: IntersectionRoot,
	ctx: IntersectionContext
): MutableInner<"intersection"> | Disjoint => {
	const result: IntersectionRoot = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const resultBasis =
		lBasis ?
			rBasis ? intersectNodes(lBasis, rBasis, ctx)
			:	lBasis
		:	rBasis
	if (resultBasis) {
		if (resultBasis instanceof Disjoint) return resultBasis

		if (resultBasis.kind === "domain" || resultBasis.kind === "proto")
			result[resultBasis.kind] = resultBasis as never
		else throwInternalError(`Unexpected basis intersection ${resultBasis}`)
	}

	return result
}

type ConstraintIntersectionState = {
	l: Constraint[]
	r: Constraint[]
	types: RawSchema[]
	ctx: IntersectionContext
}

const intersectConstraints = (
	s: ConstraintIntersectionState
): ConstraintIntersectionState | Disjoint => {
	const head = s.r.shift()
	if (!head) return s
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (!matched) {
			if (result.isSchema()) s.types.push(result)
			else s.l[i] = result as BaseConstraintNode
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

const flattenConstraints = (inner: IntersectionInner): Constraint[] => {
	const result = entriesOf(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<Constraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
			: l.innerHash < r.innerHash ? -1
			: 1
		)

	return result
}

const unflattenConstraints = (
	constraints: array<Constraint>
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

export type ConditionalTerminalIntersectionSchema = {
	onExtraneousKey?: ExtraneousKeyBehavior
}

export type ConditionalTerminalIntersectionInner = {
	onExtraneousKey?: ExtraneousKeyRestriction
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionInner

type ConditionalIntersectionKey =
	| ConstraintKind
	| keyof ConditionalTerminalIntersectionInner

export type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? "onExtraneousKey" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildSchemaValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? listable<NodeDef<k> | Inner<k>>
	:	NodeDef<k> | Inner<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind ? intersectionChildSchemaValueOf<k>
	:	ConditionalTerminalIntersectionSchema[k & ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

export type conditionalSchemaOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}
