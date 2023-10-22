import { type listable, throwParseError } from "@arktype/util"
import { type Out } from "arktype/internal/parser/tuple.js"
import { builtins } from "./builtins.js"
import { Disjoint } from "./disjoint.js"
import type { Problem } from "./io/problems.js"
import type { CheckResult, TraversalState } from "./io/traverse.js"
import { type BaseAttributes, BaseNode } from "./node.js"
import type {
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./validator.js"
import { ValidatorNode } from "./validator.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface MorphChildren extends BaseAttributes {
	in?: ValidatorNode
	out?: ValidatorNode
	morph: readonly Morph[]
}

export interface MorphSchema extends BaseAttributes {
	in?: IntersectionSchema
	out?: IntersectionSchema
	morph: listable<Morph>
}

export class MorphNode extends BaseNode<MorphChildren, typeof MorphNode> {
	static readonly kind = "morph"

	static keyKinds = this.declareKeys({
		in: "in",
		out: "out",
		morph: "morph"
	})

	static intersections = this.defineIntersections({
		morph: (l, r) => {
			if (l.morph.some((morph, i) => morph !== r.morph[i])) {
				// TODO: is this always a parse error? what about for union reduction etc.
				return throwParseError(`Invalid intersection of morphs`)
			}
			const result: MorphChildren = {
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
		validator: (l, r) => {
			const inTersection = l.in?.intersect(r) ?? r
			return inTersection instanceof Disjoint
				? inTersection
				: {
						...l.children,
						in: inTersection
				  }
		},
		constraint: (l, r): MorphChildren | Disjoint => {
			const input = l.in ?? builtins.unknown().unwrapOnly("validator")!
			const constrainedInput = input.intersect(r)
			return constrainedInput instanceof Disjoint
				? constrainedInput
				: {
						...l.children,
						in: constrainedInput
				  }
		}
	})

	static writeDefaultDescription(children: MorphChildren) {
		return ""
	}

	static from(schema: MorphSchema) {
		const children = {} as MorphChildren
		children.morph =
			typeof schema.morph === "function" ? [schema.morph] : schema.morph
		if (schema.in) {
			children.in = ValidatorNode.from(schema.in)
		}
		if (schema.out) {
			children.out = ValidatorNode.from(schema.out)
		}
		return new MorphNode(children)
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
