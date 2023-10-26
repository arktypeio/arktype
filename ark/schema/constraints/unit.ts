import {
	domainOf,
	type extend,
	hasKey,
	stringify,
	throwParseError
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

export interface UnitInner<rule = unknown> extends BaseAttributes {
	readonly unit: rule
}

export type DiscriminableUnitSchema<rule = unknown> = extend<
	BaseAttributes,
	{
		readonly is: rule
	}
>

export type UnitSchema<rule = unknown> =
	| UnitInner<rule>
	| DiscriminableUnitSchema<rule>

export class UnitNode<const rule = unknown>
	extends BaseNode<UnitInner<rule>, typeof UnitNode>
	implements BaseBasis
{
	static readonly kind = "unit"
	readonly is = this.unit
	readonly domain = domainOf(this.unit)
	declare infer: rule

	// TODO: add reference to for objects
	readonly basisName = stringify(this.unit)

	static readonly keyKinds = this.declareKeys({
		unit: "in"
	})

	static readonly compile = this.defineCompiler(
		(inner) => `${this.argName} === ${compileSerializedValue(inner.unit)}`
	)

	static readonly intersections = this.defineIntersections({
		unit: (l, r) => Disjoint.from("unit", l, r),
		constraint: (l, r) =>
			r.allows(l.is) ? l : Disjoint.from("assignability", l.is, r)
	})

	static from<const rule>(schema: UnitSchema<rule>) {
		return new UnitNode<rule>(
			hasKey(schema, "is")
				? { ...schema, unit: schema.is }
				: hasKey(schema, "unit")
				? schema
				: throwParseError(
						`Unit schema requires either an 'is' key or a 'unit' key`
				  )
		)
	}

	static writeDefaultDescription(inner: UnitInner) {
		return stringify(inner.unit)
	}
}
