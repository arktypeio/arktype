import {
	flatMorph,
	hasDomain,
	isEmptyObject,
	isKeyOf,
	throwParseError,
	type array,
	type listable,
	type mutable,
	type show
} from "@ark/util"
import {
	constraintKeyParser,
	flattenConstraints,
	intersectConstraints
} from "../constraint.js"
import type {
	Inner,
	mutableInnerOfKind,
	nodeOfKind,
	NodeSchema,
	Prerequisite
} from "../kinds.js"
import type { PredicateNode } from "../predicate.js"
import type { NodeCompiler } from "../shared/compile.js"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { ArkError } from "../shared/errors.js"
import {
	implementNode,
	structureKeys,
	type ConstraintKind,
	type IntersectionContext,
	type nodeImplementationOf,
	type OpenNodeKind,
	type RefinementKind,
	type StructuralKind
} from "../shared/implement.js"
import { intersectNodes } from "../shared/intersections.js"
import type { JsonSchema } from "../shared/jsonSchema.js"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.js"
import { hasArkKind, isNode } from "../shared/utils.js"
import type { Sequence } from "../structure/sequence.js"
import type {
	Structure,
	UndeclaredKeyBehavior
} from "../structure/structure.js"
import type { Domain } from "./domain.js"
import type { Proto } from "./proto.js"
import { BaseRoot } from "./root.js"
import { defineRightwardIntersections } from "./utils.js"

export declare namespace Intersection {
	export type BasisKind = "domain" | "proto"

	export type ChildKind = BasisKind | RefinementKind | "predicate" | "structure"

	export type FlattenedChildKind = ChildKind | StructuralKind

	export type RefinementsInner = {
		[k in RefinementKind]?: intersectionChildInnerValueOf<k>
	}

	export interface Inner extends RefinementsInner {
		domain?: Domain.Node
		proto?: Proto.Node
		structure?: Structure.Node
		predicate?: array<PredicateNode>
	}

	export type MutableInner = mutableInnerOfKind<"intersection">

	export type NormalizedSchema = Omit<Schema, StructuralKind | "undeclared">

	export type Schema<inferredBasis = any> =
		| show<
				BaseNormalizedSchema & {
					domain?: Domain.Schema
					proto?: Proto.Schema
				} & conditionalRootOf<inferredBasis>
		  >
		| IntersectionNode

	export interface ErrorContext
		extends BaseErrorContext<"intersection">,
			Inner {
		errors: readonly ArkError[]
	}

	export type Declaration = declareNode<{
		kind: "intersection"
		schema: Schema
		normalizedSchema: NormalizedSchema
		inner: Inner
		reducibleTo: "intersection" | BasisKind
		errorContext: ErrorContext
		childKind: ChildKind
	}>

	export type Node = IntersectionNode
}

const implementation: nodeImplementationOf<Intersection.Declaration> =
	implementNode<Intersection.Declaration>({
		kind: "intersection",
		hasAssociatedError: true,
		normalize: rawSchema => {
			if (isNode(rawSchema)) return rawSchema
			const { structure, ...schema } = rawSchema
			const hasRootStructureKey = !!structure
			const normalizedStructure = (structure as mutable<Structure.Schema>) ?? {}
			const normalized = flatMorph(schema, (k, v) => {
				if (isKeyOf(k, structureKeys)) {
					if (hasRootStructureKey) {
						throwParseError(
							`Flattened structure key ${k} cannot be specified alongside a root 'structure' key.`
						)
					}
					normalizedStructure[k] = v as never
					return []
				}
				return [k, v]
			}) as mutable<Intersection.NormalizedSchema>
			if (
				hasArkKind(normalizedStructure, "constraint") ||
				!isEmptyObject(normalizedStructure)
			)
				normalized.structure = normalizedStructure
			return normalized
		},
		finalizeInnerJson: ({ structure, ...rest }) =>
			hasDomain(structure, "object") ? { ...structure, ...rest } : rest,
		keys: {
			domain: {
				child: true,
				parse: (schema, ctx) => ctx.$.node("domain", schema)
			},
			proto: {
				child: true,
				parse: (schema, ctx) => ctx.$.node("proto", schema)
			},
			structure: {
				child: true,
				parse: (schema, ctx) => ctx.$.node("structure", schema),
				serialize: node => {
					if (!node.sequence?.minLength) return node.collapsibleJson
					const { sequence, ...structureJson } = node.collapsibleJson as any
					const { minVariadicLength, ...sequenceJson } =
						sequence as Sequence.NormalizedSchema
					const collapsibleSequenceJson =
						sequenceJson.variadic && Object.keys(sequenceJson).length === 1 ?
							sequenceJson.variadic
						:	sequenceJson
					return { ...structureJson, sequence: collapsibleSequenceJson }
				}
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
			pattern: {
				child: true,
				parse: constraintKeyParser("pattern")
			},
			predicate: {
				child: true,
				parse: constraintKeyParser("predicate")
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
			}) as nodeOfKind<"intersection" | Intersection.BasisKind>,
		defaults: {
			description: node =>
				node.children.length === 0 ?
					"unknown"
				:	(node.structure?.description ??
					node.children.map(child => child.description).join(" and ")),
			expected: source =>
				`  • ${source.errors.map(e => e.expected).join("\n  • ")}`,
			problem: ctx => `(${ctx.actual}) must be...\n${ctx.expected}`
		},
		intersections: {
			intersection: (l, r, ctx) => intersectIntersections(l, r, ctx),
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
							{ ...l.inner, [basis.kind]: basis },
							{ prereduced: true }
						)
				)
			})
		}
	})

export class IntersectionNode extends BaseRoot<Intersection.Declaration> {
	basis: nodeOfKind<Intersection.BasisKind> | null =
		this.domain ?? this.proto ?? null

	refinements: array<nodeOfKind<RefinementKind>> = this.children.filter(node =>
		node.isRefinement()
	)

	expression: string =
		this.structure?.expression ||
		`${this.basis ? this.basis.nestableExpression + " " : ""}${this.refinements.join(" & ")}` ||
		"unknown"

	get shortDescription(): string {
		return this.basis?.shortDescription ?? "present"
	}

	toJsonSchema(): JsonSchema {
		return this.basis?.toJsonSchema() ?? {}
	}

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.children.every(child => child.traverseAllows(data as never, ctx))

	traverseApply: TraverseApply = (data, ctx) => {
		const errorCount = ctx.currentErrorCount
		if (this.basis) {
			this.basis.traverseApply(data, ctx)
			if (ctx.currentErrorCount > errorCount) return
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				this.refinements[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return
			}
			this.refinements.at(-1)!.traverseApply(data as never, ctx)
			if (ctx.currentErrorCount > errorCount) return
		}
		if (this.structure) {
			this.structure.traverseApply(data as never, ctx)
			if (ctx.currentErrorCount > errorCount) return
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				this.predicate[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return
			}
			this.predicate.at(-1)!.traverseApply(data as never, ctx)
		}
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Allows") {
			this.children.forEach(child => js.check(child))
			js.return(true)
			return
		}

		js.initializeErrorCount()

		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.children.length > 1) js.returnIfFail()
		}
		if (this.refinements.length) {
			for (let i = 0; i < this.refinements.length - 1; i++) {
				js.check(this.refinements[i])
				js.returnIfFailFast()
			}
			js.check(this.refinements.at(-1)!)
			if (this.structure || this.predicate) js.returnIfFail()
		}
		if (this.structure) {
			js.check(this.structure)
			if (this.predicate) js.returnIfFail()
		}
		if (this.predicate) {
			for (let i = 0; i < this.predicate.length - 1; i++) {
				js.check(this.predicate[i])
				// since predicates can be chained, we have to fail immediately
				// if one fails
				js.returnIfFail()
			}
			js.check(this.predicate.at(-1)!)
		}
	}
}

export const Intersection = {
	implementation,
	Node: IntersectionNode
}

const intersectIntersections = (
	l: Intersection.Inner,
	r: Intersection.Inner,
	ctx: IntersectionContext
): BaseRoot | Disjoint => {
	// avoid treating adding instance keys as keys of lRoot, rRoot
	if (hasArkKind(l, "root") && l.hasKind("intersection"))
		return intersectIntersections(l.inner, r, ctx)
	if (hasArkKind(r, "root") && r.hasKind("intersection"))
		return intersectIntersections(l, r.inner, ctx)

	const baseInner: Intersection.MutableInner = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const basisResult =
		lBasis ?
			rBasis ?
				(intersectNodes(
					lBasis,
					rBasis,
					ctx
				) as nodeOfKind<Intersection.BasisKind>)
			:	lBasis
		:	rBasis
	if (basisResult instanceof Disjoint) return basisResult

	if (basisResult) baseInner[basisResult.kind] = basisResult as never

	return intersectConstraints({
		kind: "intersection",
		baseInner,
		l: flattenConstraints(l),
		r: flattenConstraints(r),
		roots: [],
		ctx
	})
}

export type ConditionalTerminalIntersectionRoot = {
	undeclared?: UndeclaredKeyBehavior
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
	| (t extends object ? "undeclared" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildRootValueOf<k extends Intersection.FlattenedChildKind> =
	k extends OpenNodeKind ? listable<NodeSchema<k> | Inner<k>>
	:	NodeSchema<k> | Inner<k>

type conditionalRootValueOfKey<k extends ConditionalIntersectionKey> =
	k extends Intersection.FlattenedChildKind ? intersectionChildRootValueOf<k>
	:	ConditionalTerminalIntersectionRoot[k & ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends Intersection.FlattenedChildKind> =
	k extends OpenNodeKind ? readonly nodeOfKind<k>[] : nodeOfKind<k>

export type conditionalRootOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalRootValueOfKey<k>
}
