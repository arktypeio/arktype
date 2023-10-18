import { hasKey, stringify, throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BaseBasis, BasisKind } from "./basis.js"
import { BaseConstraint } from "./constraint.js"

export interface UnitChildren<rule = unknown> extends BaseAttributes {
	readonly rule: rule
}

export type CollapsedUnitSchema<rule = unknown> = {
	readonly is: rule
}

export type UnitSchema<rule = unknown> =
	| UnitChildren<rule>
	| CollapsedUnitSchema<rule>

export class UnitNode<const rule = unknown>
	extends BaseConstraint<UnitChildren<rule>>
	implements BaseBasis
{
	readonly kind = "unit"
	declare infer: rule

	// TODO: add reference to for objects
	basisName = stringify(this.rule)

	static from<const rule>(schema: UnitSchema<rule>) {
		return new UnitNode<rule>(
			hasKey(schema, "is")
				? { rule: schema.is }
				: hasKey(schema, "rule")
				? schema
				: throwParseError(
						`Unit schema requires either an 'is' key or a 'rule' key`
				  )
		)
	}

	static writeDefaultDescription(children: UnitChildren) {
		return stringify(children.rule)
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
