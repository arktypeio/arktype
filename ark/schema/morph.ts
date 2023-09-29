import type { IntersectionInput, IntersectionNode } from "./intersection.js"
import { compileSerializedValue } from "./io/compile.js"
import type { TraversalState } from "./io/traverse.js"
import type { BaseAttributes } from "./type.js"
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
	morphs: readonly Morph[]
}

export class MorphNode<t = unknown> extends TypeNode<t, MorphSchema> {
	readonly kind = "morph"

	protected constructor(schema: MorphSchema) {
		super(schema)
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
