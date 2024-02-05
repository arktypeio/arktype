import {
	isArray,
	isEmptyObject,
	map,
	printable,
	splitByKeys,
	throwParseError,
	type evaluate,
	type last,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Prerequisite, Schema } from "../kinds.js"
import type {
	ArrayPropsSchema,
	BasePropsSchema,
	PropsSchema
} from "../refinements/props/props.js"
import type { FoldInput } from "../refinements/refinement.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	basisKinds,
	parseOpen,
	propKinds,
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

/** ensure spread prop keys like 'required' in this example:
 		`{ basis: "object", required: [...]}`
 	are nested in the 'props' key like:
 		`{ basis: "object", props: {required: [...]}}` */
export type NormalizedIntersectionSchema = Omit<
	Extract<IntersectionSchema, { props?: PropsSchema }>,
	propKeyOf<any>
>

export type IntersectionDeclaration = declareNode<{
	kind: "intersection"
	schema: IntersectionSchema
	normalizedSchema: NormalizedIntersectionSchema
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

const propKeys = map([...propKinds, "keys"], (i, k) => [k, 1] as const)

export class IntersectionNode<t = unknown> extends BaseType<
	t,
	IntersectionDeclaration,
	typeof IntersectionNode
> {
	static implementation: nodeImplementationOf<IntersectionDeclaration> =
		this.implement({
			hasAssociatedError: true,
			normalize: (def) => {
				const [propsSchema, intersectionSchema] = splitByKeys(def, propKeys)
				if (isEmptyObject(propsSchema)) {
					return intersectionSchema
				}
				if (intersectionSchema.props) {
					return throwParseError(
						`An intersection schema cannot have both a 'props' key and its flattened values (found ${Object.keys(
							propsSchema
						).join(", ")})`
					)
				}
				intersectionSchema.props = propsSchema
				return intersectionSchema
			},
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
				},
				props: {
					child: true,
					parse: (def, ctx) => ctx.$.parseNode("props", def, ctx)
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

	readonly refinements = this.children.filter(
		(child): child is Node<RefinementKind> => child.isRefinement()
	)

	// TODO: check order
	traverseAllows: TraverseAllows = (data, ctx) => {
		return this.children.every((child) => child.traverseAllows(data, ctx))
	}

	compileAllows(ctx: CompilationContext) {
		return this.children.reduceRight(
			(body, node) =>
				`if(!${node.compileAllowsInvocation(ctx)}) return false\n` + body,
			"return true\n"
		)
	}

	readonly prepredicates = this.refinements.filter(
		(node): node is Node<PrepredicateKind> => node.kind !== "predicate"
	)

	traverseApply: TraverseApply = (data, ctx) => {
		this.basis?.traverseApply(data, ctx)
		if (ctx.currentErrors.length !== 0) return
		this.prepredicates.forEach((node) => node.traverseApply(data as never, ctx))
		if (ctx.currentErrors.length !== 0) return
		this.predicate?.forEach((node) => node.traverseApply(data as never, ctx))
	}

	compileApply(ctx: CompilationContext) {
		let body = ""
		const compiledReturnIfError = `if(${ctx.ctxArg}.currentErrors.length !== 0) return\n`
		if (this.basis) {
			body = `${this.compileApplyInvocation(ctx)}\n${compiledReturnIfError}`
		}
		if (this.prepredicates.length) {
			body += this.prepredicates.reduceRight(
				(result, node) => `${node.compileApplyInvocation(ctx)}\n${result}`,
				compiledReturnIfError
			)
		}
		if (this.predicate) {
			body += this.predicate.reduceRight(
				(result, node) => `${node.compileApplyInvocation(ctx)}\n${result}`,
				compiledReturnIfError
			)
		}
		return body
	}
}

type PrepredicateKind = Exclude<RefinementKind, "predicate">

type PrimitiveRefinementKind = Exclude<RefinementKind, "props">

type primitiveRefinementKindOf<t> = {
	[k in PrimitiveRefinementKind]: t extends Prerequisite<k> ? k : never
}[PrimitiveRefinementKind]

type schemaRefinementValue<k extends NodeKind> = k extends OpenNodeKind
	? listable<Schema<k>>
	: Schema<k>

type innerRefinementValue<k extends NodeKind> = k extends OpenNodeKind
	? readonly Node<k>[]
	: Node<k>

type primitiveRefinementsOf<t> = {
	[k in primitiveRefinementKindOf<t>]?: schemaRefinementValue<k>
}

type propKeyOf<t extends object> = Exclude<
	t extends readonly unknown[] ? keyof ArrayPropsSchema : keyof BasePropsSchema,
	keyof BaseMeta
>

type propRefinementsOf<t> = [t] extends [object]
	?
			| ({ props?: PropsSchema<t> } & { [k in propKeyOf<t>]?: never })
			| ({ props?: never } & PropsSchema<t>)
	: {}

export type schemaRefinementsOf<t> = primitiveRefinementsOf<t> &
	propRefinementsOf<t>
