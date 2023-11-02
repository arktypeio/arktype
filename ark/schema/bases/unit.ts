import { domainOf, stringify } from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import { BaseRoot } from "../root.js"
import type { BaseBasis } from "./basis.js"

export type UnitInner<rule = unknown> = withAttributes<{
	readonly unit: rule
}>

export type UnitSchema<rule = unknown> = UnitInner<rule>

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	inner: UnitInner
	intersections: {
		unit: "unit" | Disjoint
		rule: "unit" | Disjoint
	}
	class: typeof UnitNode
}>

export class UnitNode<t = unknown>
	extends BaseRoot<UnitDeclaration, t>
	implements BaseBasis
{
	static readonly kind = "unit"
	static readonly declaration: UnitDeclaration

	static {
		this.classesByKind.unit = this
	}

	static readonly definition = this.define({
		kind: "unit",
		keys: {
			unit: "in"
		},
		intersections: {
			unit: (l, r) => Disjoint.from("unit", l, r),
			rule: (l, r) =>
				r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
		},
		parse: (schema) => schema,
		compileCondition: (inner) =>
			`${this.argName} === ${compileSerializedValue(inner.unit)}`,
		writeDefaultDescription: (inner) => stringify(inner.unit)
	})

	readonly domain = domainOf(this.unit)

	// TODO: add reference to for objects
	readonly basisName = stringify(this.unit)
}
