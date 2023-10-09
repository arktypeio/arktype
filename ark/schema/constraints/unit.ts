import type { conform } from "@arktype/util"
import { Hkt, stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { type BaseAttributes } from "../node.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint, constraintParser } from "./constraint.js"

export interface UnitSchema<value = unknown> extends BaseAttributes {
	unit: value
}

export type UnitInput = UnitSchema

export class UnitNode<
	schema extends UnitSchema = UnitSchema
> extends BaseConstraint<schema> {
	readonly kind = "unit"
	declare infer: schema["unit"]

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], UnitInput>): UnitNode<typeof input> => {
			return new UnitNode(input)
		}
	})()

	static from = constraintParser(this)

	hash() {
		return compileSerializedValue(this.unit)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.unit)
	}

	intersectSymmetric(other: UnitNode) {
		return Disjoint.from("unit", this, other)
	}

	intersectAsymmetric(other: ConstraintNode) {
		// TODO: allows
		return null
	}
}

export const unitNode = UnitNode.from
