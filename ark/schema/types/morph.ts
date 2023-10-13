import type { listable } from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import { builtins } from "../builtins.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import { type BaseAttributes } from "../node.js"
import type {
	IntersectionSchema,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type { IntersectionNode } from "./type.js"
import { TypeNode } from "./type.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface MorphSchema extends BaseAttributes {
	in?: IntersectionSchema
	out?: IntersectionSchema
	morphs: listable<Morph>
}

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export class MorphNode<i = any, o = unknown> extends TypeNode<
	(In: i) => Out<o>
> {
	readonly kind = "morph";
	readonly in: IntersectionNode
	readonly out: IntersectionNode
	readonly morphs: readonly Morph[]

	constructor(public schema: MorphSchema) {
		super(schema)
		this.in = builtins.unknown()
		this.out = builtins.unknown()
		this.morphs =
			typeof schema.morphs === "function" ? [schema.morphs] : schema.morphs
	}

	inId = this.in.inId
	outId = this.out.outId
	typeId = JSON.stringify({
		in: this.in.typeId,
		out: this.out.typeId,
		morphs: this.morphs.map((morph) => compileSerializedValue(morph))
	})

	branches = [this]

	writeDefaultDescription() {
		return ""
	}
}

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
				: input["morphs"] extends
						| Morph<any, infer o>
						| readonly [...unknown[], Morph<any, infer o>]
				? inferMorphOut<o>
				: never
	  >
	: never
