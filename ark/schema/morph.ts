import { type listable, throwParseError } from "@arktype/util"
import { Disjoint } from "./disjoint.js"
import type { Problem } from "./io/problems.js"
import type { CheckResult, TraversalState } from "./io/traverse.js"
import { type BaseAttributes, BaseNode, type Children } from "./node.js"
import { type BranchNode } from "./type.js"
import { ValidatorNode } from "./validator.js"
import type {
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./validator.js"

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
	readonly kind = "morph"

	static keyKinds = this.declareKeys({
		in: "in",
		out: "out",
		morph: "morph"
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

	intersectSymmetric(other: MorphNode): MorphChildren | Disjoint {
		if (this.morph.some((morph, i) => morph !== other.morph[i])) {
			// TODO: is this always a parse error? what about for union reduction etc.
			return throwParseError(`Invalid intersection of morphs`)
		}
		const result: MorphChildren = {
			morph: this.morph
		}
		if (this.in) {
			if (other.in) {
				const inTersection = this.in.intersect(other.in)
				if (inTersection instanceof Disjoint) {
					return inTersection
				}
				result.in = inTersection
			} else {
				result.in = this.in
			}
		} else if (other.in) {
			result.in = other.in
		}
		if (this.out) {
			if (other.out) {
				const outTersection = this.out.intersect(other.out)
				if (outTersection instanceof Disjoint) {
					return outTersection
				}
				result.out = outTersection
			} else {
				result.out = this.out
			}
		} else if (other.out) {
			result.out = other.out
		}
		return result
	}

	intersectAsymmetric(r: ValidatorNode) {
		const inTersection = this.in?.intersect(r) ?? r
		return inTersection instanceof Disjoint
			? inTersection
			: {
					...this.children,
					in: inTersection
			  }
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
			In: input["in"] extends {}
				? parseIntersection<input["in"]>["infer"]
				: unknown
	  ) => input["out"] extends {}
			? parseIntersection<input["out"]>["infer"]
			: input["morph"] extends
					| Morph<any, infer o>
					| readonly [...unknown[], Morph<any, infer o>]
			? inferMorphOut<o>
			: never
	: never
