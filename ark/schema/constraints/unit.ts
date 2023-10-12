import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes } from "../node.js"
import type { ConstraintNode } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface UnitSchema<rule = unknown> extends BaseAttributes {
	readonly rule: rule
}

export class UnitNode<const rule = unknown> extends BaseConstraint<UnitSchema> {
	readonly kind = "unit"
	declare infer: rule

	constructor(schema: UnitSchema<rule>) {
		super(schema)
	}

	hash() {
		return compileSerializedValue(this.rule)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectSymmetric(other: UnitNode) {
		return Disjoint.from("unit", this, other)
	}

	intersectAsymmetric(other: ConstraintNode) {
		// TODO: allows
		return null
	}
}
