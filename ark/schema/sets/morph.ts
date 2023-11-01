import { type listable, type mutable, throwParseError } from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { type BasisKind } from "../bases/basis.js"
import { builtins } from "../builtins.js"
import { Disjoint } from "../disjoint.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import { type Node } from "../nodes.js"
import { RootNode } from "../root.js"
import { IntersectionNode } from "./intersection.js"
import type {
	IntersectionSchema,
	parseIntersection,
	validateIntersectionSchema
} from "./intersection.js"

export type ValidatorNode = Node<"intersection" | BasisKind>

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type Out<o = any> = ["=>", o]

export type MorphInner = withAttributes<{
	readonly in?: ValidatorNode
	readonly out?: ValidatorNode
	readonly morph: readonly Morph[]
}>

export type MorphSchema = withAttributes<{
	readonly in?: IntersectionSchema
	readonly out?: IntersectionSchema
	readonly morph: listable<Morph>
}>

export type MorphDeclaration = declareNode<
	"morph",
	{
		schema: MorphSchema
		inner: MorphInner
		intersections: {
			morph: "morph" | Disjoint
			intersection: "morph" | Disjoint
			rule: "morph" | Disjoint
		}
	},
	typeof MorphNode
>

export class MorphNode<t = unknown> extends RootNode<MorphDeclaration, t> {
	static readonly kind = "morph"

	static {
		this.classesByKind.morph = this
	}

	static childrenOf(inner: MorphInner): ValidatorNode[] {
		return inner.in
			? inner.out
				? [inner.in, inner.out]
				: [inner.in]
			: inner.out
			? [inner.out]
			: []
	}

	static readonly keyKinds = this.declareKeys({
		in: "in",
		out: "out",
		morph: "morph"
	})

	static readonly intersections = this.defineIntersections({
		morph: (l, r) => {
			if (l.morph.some((morph, i) => morph !== r.morph[i])) {
				// TODO: is this always a parse error? what about for union reduction etc.
				// TODO: check in for union reduction
				return throwParseError(`Invalid intersection of morphs`)
			}
			const result: mutable<MorphInner> = {
				morph: l.morph
			}
			if (l.in) {
				if (r.in) {
					const inTersection = l.in.intersect(r.in)
					if (inTersection instanceof Disjoint) {
						return inTersection
					}
					result.in = inTersection
				} else {
					result.in = l.in
				}
			} else if (r.in) {
				result.in = r.in
			}
			if (l.out) {
				if (r.out) {
					const outTersection = l.out.intersect(r.out)
					if (outTersection instanceof Disjoint) {
						return outTersection
					}
					result.out = outTersection
				} else {
					result.out = l.out
				}
			} else if (r.out) {
				result.out = r.out
			}
			return result
		},
		intersection: (l, r) => {
			const inTersection = l.in?.intersect(r) ?? r
			return inTersection instanceof Disjoint
				? inTersection
				: {
						...l.inner,
						in: inTersection
				  }
		},
		rule: (l, r) => {
			const input = l.in ?? builtins().unknown
			const constrainedInput = input.intersect(r)
			return constrainedInput instanceof Disjoint
				? constrainedInput
				: {
						...l.inner,
						in: constrainedInput
				  }
		}
	})

	static compile = this.defineCompiler((inner) => "true")

	static writeDefaultDescription(inner: MorphInner) {
		return ""
	}

	static parse(schema: MorphSchema) {
		const inner = {} as mutable<MorphInner>
		inner.morph =
			typeof schema.morph === "function" ? [schema.morph] : schema.morph
		if (schema.in) {
			inner.in = IntersectionNode.parse(schema.in)
		}
		if (schema.out) {
			inner.out = IntersectionNode.parse(schema.out)
		}
		return new MorphNode(inner)
	}
}

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export type validateMorphSchema<input> = {
	[k in keyof input]: k extends "in" | "out"
		? validateIntersectionSchema<input[k]>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type parseMorph<input> = input extends MorphSchema
	? MorphNode<
			(
				In: input["in"] extends {}
					? parseIntersection<input["in"]>["infer"]
					: unknown
			) => input["out"] extends {}
				? Out<parseIntersection<input["out"]>["infer"]>
				: input["morph"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? Out<inferMorphOut<o>>
				: never
	  >
	: never
