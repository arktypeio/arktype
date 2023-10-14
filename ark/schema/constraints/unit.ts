import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"

export interface UnitChildren<rule = unknown> extends BaseAttributes {
	readonly rule: rule
}

export type UnitSchema<rule = unknown> = UnitChildren<rule>

export class UnitNode<const rule = unknown> extends BaseConstraint<
	UnitChildren<rule>
> {
	readonly kind = "unit"
	declare infer: rule

	// TODO: add reference to for objects
	defaultDescription = stringify(this.rule)

	static from<const rule>(schema: UnitSchema<rule>) {
		return new UnitNode<rule>(schema)
	}

	hash() {
		return compileSerializedValue(this.rule)
	}

	intersectSymmetric(other: UnitNode): Disjoint {
		return Disjoint.from("unit", this, other)
	}

	intersectAsymmetric() {
		return null
	}
}
