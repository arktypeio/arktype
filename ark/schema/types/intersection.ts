import {
	isArray,
	map,
	printable,
	splitByKeys,
	type evaluate,
	type last,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Prerequisite, Schema } from "../kinds.js"
import type { FoldInput } from "../refinements/refinement.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	basisKinds,
	parseOpen,
	refinementKinds,
	type BasisKind,
	type ConstraintKind,
	type NodeKind,
	type OpenNodeKind,
	type OrderedNodeKinds,
	type RefinementKind,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { ArkTypeError } from "../traversal/errors.js"
import type { instantiateBasis } from "./basis.js"
import { BaseType } from "./type.js"

export type IntersectionBasisKind = "domain" | "proto"

export type IntersectionInner = evaluate<
	BaseMeta & {
		basis?: Node<IntersectionBasisKind>
	} & {
		[k in RefinementKind]?: innerRefinementValue<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<IntersectionBasisKind> | undefined = any
> = evaluate<
	BaseMeta & {
		basis?: basis
	} & schemaRefinementsOf<
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

const refinementKeys = map(refinementKinds, (i, kind) => [kind, 1] as const)

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
					parse: (def, ctx) => ctx.$.parseNode("divisor", def, ctx)
				},
				max: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("max", def, ctx)
				},
				min: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("min", def, ctx)
				},
				maxLength: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("maxLength", def, ctx)
				},
				minLength: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("minLength", def, ctx)
				},
				before: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("before", def, ctx)
				},
				after: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("after", def, ctx)
				},
				pattern: {
					child: true,
					parse: (def, ctx) => parseOpen("pattern", def, ctx)
				},
				predicate: {
					child: true,
					parse: (def, ctx) => parseOpen("predicate", def, ctx)
				}
			},
			reduce: (inner, scope) => {
				const [refinements, base] = splitByKeys(inner, refinementKeys)
				let result: FoldInput<"predicate"> | Disjoint = base
				const flatRefinements = Object.values(refinements).flat()
				if (flatRefinements.length === 0 && base.basis) {
					return base.basis
				}
				// TODO: are these ordered?
				for (const refinement of flatRefinements) {
					if (result instanceof Disjoint) {
						break
					}
					result = refinement.foldIntersection(result)
				}
				if (result instanceof Disjoint) {
					return result.throw()
				}
				return scope.parsePrereduced("intersection", result)
			},
			defaults: {
				description(constraints) {
					const flatConstraints = Object.values(constraints).flat()
					return flatConstraints.length === 0
						? "an unknown value"
						: flatConstraints.join(" and ")
				},
				expected(source) {
					return "  • " + source.errors.map((e) => e.expected).join("\n  • ")
				},
				problem(ctx) {
					return `must be...\n${ctx.expected}\n(was ${printable(ctx.data)})`
				}
			}
		})

	protected intersectOwnInner(r: IntersectionNode) {
		// ensure we can safely mutate inner as well as its shallow open intersections
		let result = map(this.inner, (k, v) => [k, isArray(v) ? [...v] : v]) as
			| FoldInput<last<OrderedNodeKinds>>
			| Disjoint

		for (const constraint of r.refinements) {
			if (result instanceof Disjoint) {
				break
			}
			result = constraint.foldIntersection(result)
		}
		return result
	}

	intersectRightwardInner(
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

type refinementKindOf<t> = {
	[k in RefinementKind]: t extends Prerequisite<k> ? k : never
}[RefinementKind]

type schemaRefinementValue<k extends NodeKind> = k extends OpenNodeKind
	? listable<Schema<k>>
	: Schema<k>

type innerRefinementValue<k extends NodeKind> = k extends OpenNodeKind
	? readonly Node<k>[]
	: Node<k>

export type schemaRefinementsOf<t> = {
	[k in refinementKindOf<t>]?: schemaRefinementValue<k>
}
