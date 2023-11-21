import { domainOf, stringify } from "@arktype/util"
import { In, compileSerializedValue } from "../io/compile.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type UnitSchema<is = unknown> = UnitInner<is>

export type UnitInner<is = unknown> = withAttributes<{
	readonly is: is
}>

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

export const UnitImplementation = defineNode({
	kind: "unit",
	keys: {
		is: {
			preserveUndefined: true
		}
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.is) ? l : Disjoint.from("assignability", l.is, r)
	},
	writeDefaultDescription: (inner) => stringify(inner.is),
	normalize: (schema) => schema,
	attach: (node) => ({
		basisName: stringify(node.is),
		domain: domainOf(node.is),
		condition: `${In} === ${compileSerializedValue(node.is)}`
	})
})
