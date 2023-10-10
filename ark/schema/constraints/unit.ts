import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Prevalidated } from "../node.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface UnitSchema<value = unknown> extends BaseAttributes {
	readonly unit: value
}

export class UnitNode<const unit = unknown> extends BaseConstraint<UnitSchema> {
	readonly kind = "unit"
	declare infer: unit

	constructor(schema: UnitSchema<unit>, prevalidated?: Prevalidated) {
		super(schema)
	}

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
