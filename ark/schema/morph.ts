import { type listable, type mutable, throwParseError } from "@arktype/util"
import { type Out } from "arktype/internal/parser/tuple.js"
import { BaseNode, type withAttributes } from "./base.js"
import { builtins } from "./builtins.js"
import { Disjoint } from "./disjoint.js"
import type {
	IntersectionInner,
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import { IntersectionNode } from "./intersection.js"
import type { Problem } from "./io/problems.js"
import type { CheckResult, TraversalState } from "./io/traverse.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type MorphInner = withAttributes<{
	readonly in?: IntersectionNode
	readonly out?: IntersectionNode
	readonly morph: readonly Morph[]
}>

export type MorphSchema = withAttributes<{
	readonly in?: IntersectionSchema | IntersectionInner
	readonly out?: IntersectionSchema | IntersectionInner
	readonly morph: listable<Morph>
}>

export class MorphNode<i = unknown, o = unknown> extends BaseNode<
	MorphInner,
	typeof MorphNode,
	i
> {
	static readonly kind = "morph"

	static childrenOf(inner: MorphInner) {
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
		morph: (l, r): MorphInner | Disjoint => {
			if (l.morph.some((morph, i) => morph !== r.morph[i])) {
				// TODO: is this always a parse error? what about for union reduction etc.
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
		intersection: (l, r): MorphInner | Disjoint => {
			const inTersection = l.in?.intersect(r) ?? r
			return inTersection instanceof Disjoint
				? inTersection
				: {
						...l.inner,
						in: inTersection
				  }
		},
		constraint: (l, r): MorphInner | Disjoint => {
			const input = l.in ?? builtins.unknown()
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

	static from(schema: MorphSchema) {
		const inner = {} as mutable<MorphInner>
		inner.morph =
			typeof schema.morph === "function" ? [schema.morph] : schema.morph
		if (schema.in) {
			inner.in = IntersectionNode.from(schema.in)
		}
		if (schema.out) {
			inner.out = IntersectionNode.from(schema.out)
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

export type validateMorphInput<input> = {
	[k in keyof input]: k extends "in" | "out"
		? validateIntersectionInput<input[k]>
		: k extends keyof MorphSchema
		? MorphSchema[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type parseMorph<input> = input extends MorphSchema
	? (
			In: input["in"] extends {} ? parseIntersection<input["in"]> : unknown
	  ) => input["out"] extends {}
			? Out<parseIntersection<input["out"]>>
			: input["morph"] extends
					| Morph<any, infer o>
					| readonly [...unknown[], Morph<any, infer o>]
			? Out<inferMorphOut<o>>
			: never
	: never
