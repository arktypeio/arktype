import type { listable } from "@arktype/util"
import type { Out } from "arktype/internal/parser/tuple.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Problem } from "../io/problems.js"
import type { CheckResult, TraversalState } from "../io/traverse.js"
import type { BaseAttributes } from "../node.js"
import type {
	IntersectionInput,
	parseIntersection,
	validateIntersectionInput
} from "./intersection.js"
import type { IntersectionNode } from "./type.js"
import { TypeNode } from "./type.js"

export type MorphSchema = BaseAttributes & {
	in: IntersectionNode
	out: IntersectionNode
	morphs: readonly Morph[]
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type MorphInput = BaseAttributes & {
	in?: IntersectionInput
	out?: IntersectionInput
	morphs: listable<Morph>
}

export type inferMorphOut<out> = out extends CheckResult<infer t>
	? out extends null
		? // avoid treating any/never as CheckResult
		  out
		: t
	: Exclude<out, Problem>

export class MorphNode<i = any, o = unknown> extends TypeNode<
	(In: i) => Out<o>,
	MorphSchema
> {
	readonly kind = "morph"

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
		: k extends keyof MorphInput
		? MorphInput[k]
		: `'${k & string}' is not a valid morph schema key`
}

export type parseMorph<input> = input extends MorphInput
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
