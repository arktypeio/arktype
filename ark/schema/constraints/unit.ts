import { domainOf, hasKey, stringify, throwParseError } from "@arktype/util"
import { type withAttributes } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { RootNode } from "../root.js"
import type { BaseBasis } from "./basis.js"

export type UnitInner<rule = unknown> = withAttributes<{
	readonly unit: rule
}>

export type DiscriminableUnitSchema<rule = unknown> = withAttributes<{
	readonly is: rule
}>

export type UnitSchema<rule = unknown> =
	| UnitInner<rule>
	| DiscriminableUnitSchema<rule>

export class UnitNode<const rule = unknown>
	extends RootNode<UnitInner<rule>, typeof UnitNode, rule>
	implements BaseBasis
{
	static readonly kind = "unit"
	readonly is = this.unit
	readonly domain = domainOf(this.unit)

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
