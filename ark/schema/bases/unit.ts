import type { conform } from "@arktype/util"
import { Hkt, stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { parser } from "../schema.js"
import type { Constraint, ConstraintSchema } from "./basis.js"
import { ConstraintNode } from "./basis.js"

export interface UnitSchema<value = unknown> extends ConstraintSchema {
	is: value
}

export class UnitNode<
	schema extends UnitSchema = UnitSchema
> extends ConstraintNode<schema> {
	readonly kind = "identity"
	declare infer: schema["is"]

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], UnitSchema>): UnitNode<typeof input> => {
			return new UnitNode(input)
		}
	})()

	static from = parser(this)

	hash() {
		return compileSerializedValue(this.is)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.is)
	}

	reduceWith(other: Constraint) {
		return other.kind === "identity"
			? Disjoint.from("identity", this, other)
			: null
	}
}

export const identityNode = UnitNode.from
