import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface UnitSchema<rule = unknown> extends BaseAttributes {
	readonly rule: rule
}

export class UnitNode<const rule = unknown> extends BaseConstraint {
	readonly kind = "unit"
	declare infer: rule
	readonly rule: rule

	constructor(public schema: UnitSchema<rule>) {
		super(schema)
		this.rule = schema.rule
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

	intersectAsymmetric(other: Node<ConstraintKind>) {
		return null
	}
}
