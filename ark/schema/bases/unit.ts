import { domainOf, printable } from "@arktype/util"
import { composeParser } from "../parse.js"
import {
	In,
	compileSerializedValue,
	composePrimitiveTraversal
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { BaseType } from "../type.js"

export type UnitSchema<value = unknown> = withAttributes<UnitInner<value>>

export type UnitInner<value = unknown> = {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	inner: UnitInner
	intersections: {
		unit: "unit" | Disjoint
		default: "unit" | Disjoint
	}
}>

export class UnitNode<t = unknown> extends BaseType<t, typeof UnitNode> {
	static declaration: UnitDeclaration
	static parser = this.composeParser({
		kind: "unit",
		keys: {
			unit: {
				preserveUndefined: true
			}
		},
		normalize: (schema) => schema
	})

	serializedValue = compileSerializedValue(this.unit)
	traverseAllows = (data: unknown) => data === this.unit
	traverseApply = composePrimitiveTraversal(this, this.traverseAllows)
	basisName = printable(this.unit)
	domain = domainOf(this.unit)
	condition = `${In} === ${this.serializedValue}`
	negatedCondition = `${In} !== ${this.serializedValue}`

	writeDefaultDescription() {
		return this.basisName
	}

	static intersections = this.defineIntersections({
		unit: (l, r) => Disjoint.from("unit", l, r),
		default: (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
	})
}

// compile: compilePrimitive,
