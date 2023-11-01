import { domainOf, stringify } from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { RootNode } from "../root.js"
import type { BaseBasis } from "./basis.js"

export type UnitInner<rule = unknown> = withAttributes<{
	readonly unit: rule
}>

export type UnitSchema<rule = unknown> = UnitInner<rule>

export type UnitDeclaration = declareNode<
	"unit",
	{
		schema: UnitSchema
		inner: UnitInner
		intersections: {
			unit: "unit" | Disjoint
			rule: "unit" | Disjoint
		}
	},
	typeof UnitNode
>

export class UnitNode
	extends RootNode<UnitDeclaration, unknown>
	implements BaseBasis
{
	static readonly kind = "unit"

	static {
		this.classesByKind.unit = this
	}

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
		rule: (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
	})

	static parse(schema: UnitSchema) {
		return new UnitNode(schema)
	}

	static writeDefaultDescription(inner: UnitInner) {
		return stringify(inner.unit)
	}
}
