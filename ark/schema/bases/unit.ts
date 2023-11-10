import { stringify } from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { Disjoint } from "../disjoint.ts"
import { compileSerializedValue, In } from "../io/compile.ts"

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
		default: "unit" | Disjoint
	}
}>

// readonly domain = domainOf(this.unit)

// // TODO: add reference to for objects
// readonly basisName = stringify(this.unit)

// readonly implicitBasis = this

export const UnitImplementation = defineNode({
	kind: "unit",
	keys: {
		unit: {}
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
	},
	parseSchema: (schema) => schema,
	compileCondition: (inner) =>
		`${In} === ${compileSerializedValue(inner.unit)}`,
	writeDefaultDescription: (inner) => stringify(inner.unit)
})
