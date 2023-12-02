import { domainOf, printable } from "@arktype/util"
import { composeParser } from "../parse.js"
import {
	In,
	compileSerializedValue,
	composePrimitiveTraversal
} from "../shared/compilation.js"
import type {
	BaseAttributes,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type UnitSchema<value = unknown> = withAttributes<UnitInner<value>>

export type UnitInner<value = unknown> = {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	normalizedSchema: UnitSchema
	inner: UnitInner
	meta: BaseAttributes
	intersections: {
		unit: "unit" | Disjoint
		default: "unit" | Disjoint
	}
	attach: BasisAttachments
}>

export const UnitImplementation = composeParser<UnitDeclaration>({
	kind: "unit",
	keys: {
		unit: {
			preserveUndefined: true
		}
	},
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
	}
})

// intersections: {
// 	unit: (l, r) => Disjoint.from("unit", l, r),
// 	default: (l, r) =>
// 		r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
// },
// writeDefaultDescription: (inner) => printable(inner.unit),
// compile: compilePrimitive,
