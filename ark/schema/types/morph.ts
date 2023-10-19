import type { listable } from "@arktype/util"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import { type BaseAttributes } from "../node.js"
import type {
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type { IntersectionNode, MorphNode } from "./type.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface MorphChildren extends BaseAttributes {
	in?: IntersectionNode
	out?: IntersectionNode
	morph: readonly Morph[]
}

export interface MorphSchema extends BaseAttributes {
	in?: IntersectionSchema
	out?: IntersectionSchema
	morph: listable<Morph>
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
	? MorphNode<
			input["in"] extends {}
				? parseIntersection<input["in"]>["infer"]
				: unknown,
			input["out"] extends {}
				? parseIntersection<input["out"]>["infer"]
				: input["morph"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? inferMorphOut<o>
				: never
	  >
	: never
