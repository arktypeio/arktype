import {
	groupBy,
	isArray,
	map,
	printable,
	type evaluate,
	type last,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Prerequisite, Schema } from "../kinds.js"
import type { SchemaParseContext } from "../parse.js"
import type {
	FoldInput,
	GroupedConstraints
} from "../refinements/refinement.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	basisKinds,
	type BasisKind,
	type ClosedRefinementKind,
	type ConstraintKind,
	type OpenRefinementKind,
	type OrderedNodeKinds,
	type PropRefinementKind,
	type RefinementKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { ArkTypeError } from "../traversal/errors.js"
import type { instantiateBasis } from "./basis.js"
import { BaseType } from "./type.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = evaluate<
	BaseMeta & { basis?: Node<IntersectionBasisKind> } & {
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<IntersectionBasisKind> | undefined = any
> = evaluate<
	BaseMeta & {
		basis?: basis
	} & conditionalSchemaValuesOf<
			basis extends Schema<BasisKind>
				? instantiateBasis<basis>["infer"]
				: unknown
		>
>

export type ConstraintSet = readonly Node<ConstraintKind>[]

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: IntersectionSchema
	inner: IntersectionInner
	composition: "composite"
	expectedContext: {
		errors: readonly ArkTypeError[]
	}
	disjoinable: true
	childKind: ConstraintKind
}>

// 	readonly literalKeys = this.named.map((prop) => prop.key.name)
// 	readonly namedKeyOf = cached(() => node.unit(...this.literalKeys))
// 	readonly indexedKeyOf = cached(
// 		() =>
// 			new TypeNode(
// 				this.indexed.flatMap((entry) => entry.key.branches),
// 				this.meta
// 			)
// 	)
// 	readonly keyof = cached(() => this.namedKeyOf().or(this.indexedKeyOf()))

// get(key: string | TypeNode) {
// 	return typeof key === "string"
// 		? this.named.find((entry) => entry.value.branches)?.value
// 		: this.indexed.find((entry) => entry.key.equals(key))?.value
// }

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionDeclaration,
	typeof IntersectionNode
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			hasAssociatedError: true,
			normalize: (def) => def,
			addParseContext: (ctx) => {
				const def = ctx.definition as IntersectionSchema
				ctx.basis = def.basis && ctx.$.parseTypeNode(def.basis, basisKinds)
			},
			keys: {
				basis: {
					child: true,
					// the basis has already been preparsed and added to context
					parse: (_, ctx) => ctx.basis
				},
				divisor: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("divisor", def, ctx)
				},
				max: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("max", def, ctx)
				},
				min: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("min", def, ctx)
				},
				maxLength: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("maxLength", def, ctx)
				},
				minLength: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("minLength", def, ctx)
				},
				before: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("before", def, ctx)
				},
				after: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("after", def, ctx)
				},
				pattern: {
					child: true,
					parse: (def, ctx) => parseOpenRefinement("pattern", def, ctx)
				},
				predicate: {
					child: true,
					parse: (def, ctx) => parseOpenRefinement("predicate", def, ctx)
				},
				optional: {
					child: true,
					parse: (def, ctx) => parseOpenRefinement("optional", def, ctx)
				},
				required: {
					child: true,
					parse: (def, ctx) => parseOpenRefinement("required", def, ctx)
				},
				index: {
					child: true,
					parse: (def, ctx) => parseOpenRefinement("index", def, ctx)
				},
				sequence: {
					child: true,
					parse: (def, ctx) => parseClosedRefinement("sequence", def, ctx)
				}
			},
			reduce: (inner, scope) => {
				const inputConstraints = flattenConstraints(inner)
				const reducedConstraints = reduceConstraints([], inputConstraints)
				if (reducedConstraints instanceof Disjoint) {
					return reducedConstraints.throw()
				}
				if (
					reducedConstraints.length === 1 &&
					reducedConstraints[0].isBasis()
				) {
					// TODO: description?
					return reducedConstraints[0]
				}
				if (reducedConstraints.length === inputConstraints.length) {
					return
				}
				return scope.parsePrereduced(
					"intersection",
					unflattenConstraints(reducedConstraints)
				)
			},
			defaults: {
				description(inner) {
					const constraints = flattenConstraints(inner)
					return constraints.length === 0
						? "an unknown value"
						: constraints.join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}\n(was ${printable(ctx.data)})`
				}
			}
		})

	readonly constraints: ConstraintSet = flattenConstraints(this.inner)
	readonly groups: GroupedConstraints = groupBy(
		this.constraints,
		"constraintGroup"
	)
	readonly props = this.groups.props
	readonly shallow = this.groups.shallow

	protected intersectOwnInner(r: IntersectionNode) {
		// ensure we can safely mutate inner as well as its shallow open intersections
		let result = map(this.inner, (k, v) => [k, isArray(v) ? [...v] : v]) as
			| FoldInput<last<OrderedNodeKinds>>
			| Disjoint
		for (const constraint of r.constraints as Node<RefinementKind>[]) {
			if (result instanceof Disjoint) {
				break
			}
			result = constraint.foldIntersection(result)
		}
		return result
	}

	protected intersectRightwardInner(
		r: Node<IntersectionBasisKind>
	): IntersectionInner | Disjoint {
		const basis = this.basis?.intersect(r) ?? r
		// TODO: meta should not be included here?
		return basis instanceof Disjoint
			? basis
			: {
					...this.inner,
					basis
			  }
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const rejectsData = (constraint: Node<ConstraintKind> | undefined) =>
			constraint?.traverseAllows(data as never, ctx) === false

		if (rejectsData(this.basis)) return false
		if (this.shallow?.some(rejectsData)) return false
		if (this.props?.some(rejectsData)) return false
		if (this.predicate?.some(rejectsData)) return false
		return true
	}

	compileAllows(ctx: CompilationContext) {
		let body = ""
		const compileAndAppend = (constraint: Node<ConstraintKind> | undefined) =>
			constraint &&
			(body += `if(!${constraint.compileAllowsInvocation(ctx)}) return false\n`)

		compileAndAppend(this.basis)
		this.shallow?.forEach(compileAndAppend)
		this.props?.forEach(compileAndAppend)
		this.predicate?.forEach(compileAndAppend)
		body += "return true\n"
		return body
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const groupRejectsData = (
			group: readonly Node<ConstraintKind>[] | undefined
		) => {
			if (group === undefined) {
				return
			}
			for (const node of group) {
				node.traverseApply(data as never, ctx)
			}
			return ctx.currentErrors.length !== 0
		}
		if (groupRejectsData(this.groups.basis)) return
		if (groupRejectsData(this.shallow)) return
		if (groupRejectsData(this.props)) return
		return groupRejectsData(this.predicate)
	}

	compileApply(ctx: CompilationContext) {
		const compiledGroups: string[] = []
		const compileAndAppendGroup = (
			group: readonly Node<ConstraintKind>[] | undefined
		) => {
			if (group === undefined) {
				return
			}
			let compiled = ""
			for (const node of group) {
				compiled += `${node.compileApplyInvocation(ctx)}\n`
			}
			compiledGroups.push(compiled)
		}
		compileAndAppendGroup(this.groups.basis)
		compileAndAppendGroup(this.shallow)
		compileAndAppendGroup(this.props)
		compileAndAppendGroup(this.predicate)
		return compiledGroups.join(
			`\nif(${ctx.ctxArg}.currentErrors.length !== 0) return\n`
		)
	}
}

export type ConditionalConstraintKind = PropRefinementKind | RefinementKind

export type KeyBehavior = "loose" | "strict" | "prune"

export type ConditionalTerminalIntersectionInner = {
	// TODO: don't serialize loose
	keys?: KeyBehavior
}

type ConditionalTerminalIntersectionKey =
	keyof ConditionalTerminalIntersectionInner

type conditionalChildKindOf<t> = {
	[k in ConditionalConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConditionalConstraintKind]

export type ConditionalIntersectionKey =
	| ConditionalConstraintKind
	| keyof ConditionalTerminalIntersectionInner

export type conditionalIntersectionKeyOf<t> =
	| conditionalChildKindOf<t>
	| (t extends object ? "keys" : never)

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends OpenRefinementKind
		? listable<Schema<k>>
		: k extends ClosedRefinementKind
		? Schema<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends OpenRefinementKind
		? readonly Node<k>[]
		: k extends ClosedRefinementKind
		? Node<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

export type conditionalSchemaValuesOf<t> = {
	[k in conditionalChildKindOf<t>]?: conditionalSchemaValueOfKey<k>
}

export const parseClosedRefinement = <kind extends ClosedRefinementKind>(
	kind: kind,
	input: Schema<kind>,
	ctx: SchemaParseContext
): Node<kind> => {
	return ctx.$.parseNode(kind, input) as never
}

export const parseOpenRefinement = <kind extends OpenRefinementKind>(
	kind: kind,
	input: listable<Schema<kind>>,
	ctx: SchemaParseContext
): readonly Node<kind>[] | undefined => {
	if (isArray(input)) {
		if (input.length === 0) {
			// Omit empty lists as input
			return
		}
		return input
			.map((refinement) => ctx.$.parseNode(kind, refinement))
			.sort((l, r) => (l.innerId < r.innerId ? -1 : 1)) as never
	}
	return [ctx.$.parseNode(kind, input)] as never
}
