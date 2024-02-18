import {
	conflatenateAll,
	isArray,
	pick,
	printable,
	remap,
	splitByKeys,
	type evaluate,
	type last,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { FoldInput } from "../constraints/constraint.js"
import {
	PropsGroup,
	type ExtraneousKeyBehavior,
	type ExtraneousKeyRestriction,
	type PropsGroupInner
} from "../constraints/props.js"
import type { Inner, Prerequisite, Schema } from "../kinds.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	basisKinds,
	constraintKinds,
	parseOpen,
	propKinds,
	type BasisKind,
	type ConstraintKind,
	type IntersectionChildKind,
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
		[k in ConditionalIntersectionKey]?: conditionalInnerValueOfKey<k>
	}
>

export type IntersectionSchema<
	basis extends Schema<IntersectionBasisKind> | undefined = any
> = evaluate<
	BaseMeta & {
		basis?: basis
	} & conditionalSchemaOf<
			basis extends Schema<BasisKind>
				? instantiateBasis<basis>["infer"]
				: unknown
		>
>

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
	childKind: IntersectionChildKind
}>

const constraintKeys = remap(constraintKinds, (i, kind) => [kind, 1] as const)

const propKeys = remap(
	[...propKinds, "onExtraneousKey"] satisfies (keyof PropsGroupInner)[],
	(i, k) => [k, 1] as const
)

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
			addParseContext: (ctx) => {
				const def = ctx.definition as IntersectionSchema
				ctx.basis = def.basis && ctx.$.parseTypeNode(def.basis, basisKinds)
			},
			normalize: (schema) => schema,
			keys: {
				basis: {
					child: true,
					// the basis has already been preparsed and added to context
					parse: (_, ctx) => ctx.basis
				},
				divisor: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("divisor", def, ctx)
				},
				max: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("max", def, ctx)
				},
				min: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("min", def, ctx)
				},
				maxLength: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("maxLength", def, ctx)
				},
				minLength: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("minLength", def, ctx)
				},
				before: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("before", def, ctx)
				},
				after: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("after", def, ctx)
				},
				pattern: {
					child: true,
					parse: (def, ctx) => parseOpen("pattern", def, ctx)
				},
				predicate: {
					child: true,
					parse: (def, ctx) => parseOpen("predicate", def, ctx)
				},
				required: {
					child: true,
					parse: (def, ctx) => parseOpen("required", def, ctx)
				},
				optional: {
					child: true,
					parse: (def, ctx) => parseOpen("optional", def, ctx)
				},
				index: {
					child: true,
					parse: (def, ctx) => parseOpen("index", def, ctx)
				},
				sequence: {
					child: true,
					parse: (def, ctx) => ctx.$.parse("sequence", def, ctx)
				},
				onExtraneousKey: {
					parse: (def) => (def === "ignore" ? undefined : def)
				}
			},
			reduce: (inner, scope) => {
				const [constraints, base] = splitByKeys(inner, constraintKeys)
				const result: FoldInput<"predicate"> = base
				const flatConstraints = Object.values(constraints).flat()
				if (flatConstraints.length === 0 && base.basis) {
					return base.basis
				}
				// TODO: are these ordered?
				for (const constraint of flatConstraints) {
					constraint.foldIntersection(result)?.throw()
				}
				return scope.parse("intersection", result, { prereduced: true })
			},
			defaults: {
				description(inner) {
					const children = Object.values(inner).flat()
					return children.length === 0
						? "an unknown value"
						: children.join(" and ")
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
		const result = remap(this.inner, (k, v) => [
			k,
			isArray(v) ? [...v] : v
		]) as FoldInput<last<OrderedNodeKinds>>
		for (const constraint of r.constraints) {
			constraint.foldIntersection(result)?.throw()
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

	readonly constraints = this.children.filter(
		(child): child is Node<ConstraintKind> => child.isConstraint()
	)
	readonly shallows = this.constraints.filter(
		(node): node is Node<RefinementKind> => node.isRefinement()
	)
	readonly props = new PropsGroup({
		onExtraneousKey: "ignore",
		...pick(this.inner, propKeys)
	})
	readonly traversables = conflatenateAll<
		Node<BasisKind | RefinementKind | "predicate"> | PropsGroup
	>(this.basis, this.shallows, this.props, this.predicate)

	traverseAllows: TraverseAllows = (data, ctx) =>
		this.traversables.every((traversable) =>
			traversable.traverseAllows(data as never, ctx)
		)

	traverseApply: TraverseApply = (data, ctx) => {
		this.basis?.traverseApply(data, ctx)
		if (ctx.currentErrors.length !== 0) return
		this.shallows.forEach((node) => node.traverseApply(data as never, ctx))
		this.props.traverseApply(data as never, ctx)
		if (ctx.currentErrors.length !== 0) return
		this.predicate?.forEach((node) => node.traverseApply(data as never, ctx))
	}

	compile(js: NodeCompiler) {
		if (js.traversalKind === "Allows") {
			this.children.forEach((node) => js.check(node))
			return js.return(true)
		}
		const hasErrors = `${js.ctx}.currentErrors.length !== 0`
		if (this.basis) {
			js.check(this.basis)
			// we only have to return conditionally if this is not the last check
			if (this.constraints.length) {
				js.if(hasErrors, () => js.return())
			}
		}
		if (this.shallows.length) {
			this.shallows.forEach((node) => js.check(node))
			if (this.predicate) {
				js.if(hasErrors, () => js.return())
			}
		}
		this.props.compile(js)
		this.predicate?.forEach((node) => js.check(node))
	}
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

type constraintKindOf<t> = {
	[k in ConstraintKind]: t extends Prerequisite<k> ? k : never
}[ConstraintKind]

type conditionalIntersectionKeyOf<t> =
	| constraintKindOf<t>
	| (t extends object ? "onExtraneousKey" : never)

// not sure why explicitly allowing Inner<k> is necessary in these cases,
// but remove if it can be removed without creating type errors
type intersectionChildSchemaValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? listable<Schema<k> | Inner<k>> : Schema<k> | Inner<k>

type conditionalSchemaValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildSchemaValueOf<k>
		: ConditionalTerminalIntersectionSchema[k &
				ConditionalTerminalIntersectionKey]

type intersectionChildInnerValueOf<k extends IntersectionChildKind> =
	k extends OpenNodeKind ? readonly Node<k>[] : Node<k>

type conditionalInnerValueOfKey<k extends ConditionalIntersectionKey> =
	k extends IntersectionChildKind
		? intersectionChildInnerValueOf<k>
		: ConditionalTerminalIntersectionInner[k &
				ConditionalTerminalIntersectionKey]

export type conditionalSchemaOf<t> = {
	[k in conditionalIntersectionKeyOf<t>]?: conditionalSchemaValueOfKey<k>
}
