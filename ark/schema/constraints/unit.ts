import { hasKey, stringify, throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

export interface UnitChildren<rule = unknown> extends BaseAttributes {
	readonly unit: rule
}

export type CollapsedUnitSchema<rule = unknown> = {
	readonly is: rule
}

export type UnitSchema<rule = unknown> =
	| UnitChildren<rule>
	| CollapsedUnitSchema<rule>

export class UnitNode<const rule = unknown>
	extends BaseNode<UnitChildren<rule>, typeof UnitNode>
	implements BaseBasis
{
	static readonly kind = "unit"
	readonly is = this.unit
	declare infer: rule

	// TODO: add reference to for objects
	basisName = stringify(this.unit)

	static keyKinds = this.declareKeys({
		unit: "in"
	})

	static intersections = this.defineIntersections({
		unit: (l, r) => Disjoint.from("unit", l, r),
		constraint: (l, r) =>
			r.allows(l.is) ? l : Disjoint.from("assignability", l.is, r)
	})

	static from<const rule>(schema: UnitSchema<rule>) {
		return new UnitNode<rule>(
			hasKey(schema, "is")
				? { unit: schema.is }
				: hasKey(schema, "rule")
				? schema
				: throwParseError(
						`Unit schema requires either an 'is' key or a 'rule' key`
				  )
		)
	}

	static writeDefaultDescription(children: UnitChildren) {
		return stringify(children.unit)
	}
}
