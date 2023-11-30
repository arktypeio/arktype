import { domainOf, printable } from "@arktype/util"
import {
	In,
	compilePrimitive,
	compileSerializedValue,
	composePrimitiveTraversal
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type UnitSchema<value = unknown> = UnitInner<value>

export type UnitInner<value = unknown> = withAttributes<{
	readonly unit: value
}>

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	inner: UnitInner
	intersections: {
		unit: "unit" | Disjoint
		default: "unit" | Disjoint
	}
	attach: BasisAttachments<"unit">
}>

export const UnitImplementation = defineNode({
	kind: "unit",
	keys: {
		unit: {
			preserveUndefined: true
		}
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
	},
	writeDefaultDescription: (inner) => printable(inner.unit),
	normalize: (schema) => schema,
	attach: (node) => {
		const serializedValue = compileSerializedValue(node.unit)
		const traverseAllows = (data: unknown) => data === node.unit
		return {
			basisName: printable(node.unit),
			traverseAllows,
			traverseApply: composePrimitiveTraversal(node, traverseAllows),
			domain: domainOf(node.unit),
			condition: `${In} === ${serializedValue}`,
			negatedCondition: `${In} !== ${serializedValue}`
		}
	},
	compile: compilePrimitive
})
