import { domainOf, stringify } from "@arktype/util"
import { In, compileSerializedValue } from "../io/compile.ts"
import type { declareNode, withAttributes } from "../shared/declare.ts"
import { defineNode } from "../shared/define.ts"
import { Disjoint } from "../shared/disjoint.ts"
import type { BasisAttachments } from "./basis.ts"

export type UnitSchema<rule = unknown> = UnitInner<rule>

export type UnitInner<rule = unknown> = withAttributes<{
	readonly is: rule
}>

export type UnitDeclaration = declareNode<{
	kind: "unit"
	expandedSchema: UnitSchema
	inner: UnitInner
	intersections: {
		unit: "unit" | Disjoint
		default: "unit" | Disjoint
	}
	attach: BasisAttachments
}>

export const UnitImplementation = defineNode({
	kind: "unit",
	keys: {
		is: {}
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.is) ? l : Disjoint.from("assignability", l.is, r)
	},
	writeDefaultDescription: (inner) => stringify(inner.is),
	attach: (inner) => ({
		basisName: stringify(inner),
		domain: domainOf(inner.is),
		condition: `${In} === ${compileSerializedValue(inner.is)}`
	})
})
