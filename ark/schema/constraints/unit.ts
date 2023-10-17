import { hasKey, stringify, throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
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

export class UnitNode<const rule = unknown> extends BaseConstraint<
	UnitChildren<rule>
> {
	readonly kind = "unit"
	declare infer: rule

	// TODO: add reference to for objects
	defaultDescription = stringify(this.rule)

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

	applicableTo(basis: Node<BasisKind> | undefined): basis is undefined {
		return basis === undefined
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
