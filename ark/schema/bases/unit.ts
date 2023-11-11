import { domainOf, stringify } from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { Disjoint } from "../disjoint.ts"
import { compileSerializedValue, In } from "../io/compile.ts"
import { type BasisAttachments } from "./basis.ts"

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
	attach: BasisAttachments
}>

// readonly domain = domainOf(this.unit)

export const UnitImplementation = defineNode({
	kind: "unit",
	keys: {
		unit: "leaf"
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
	},
	parse: (schema) => schema,
	writeDefaultDescription: (inner) => stringify(inner.unit),
	attach: (inner) => ({
		basisName: stringify(inner),
		domain: domainOf(inner.unit),
		condition: `${In} === ${compileSerializedValue(inner.unit)}`
	})
})
