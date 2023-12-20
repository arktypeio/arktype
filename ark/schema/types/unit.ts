import { domainOf, printable } from "@arktype/util"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeImplementation } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import { compileSerializedValue } from "../traversal/registry.js"
import { BaseBasis } from "./basis.js"

export type UnitSchema<value = unknown> = withAttributes<UnitInner<value>>

export type UnitInner<value = unknown> = {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	normalizedSchema: UnitSchema
	inner: UnitInner
	intersections: {
		unit: "unit" | Disjoint
		default: "unit" | Disjoint
	}
}>

export class UnitNode<t = unknown> extends BaseBasis<
	t,
	UnitDeclaration,
	typeof UnitNode
> {
	static implementation: NodeImplementation<UnitDeclaration> = {
		keys: {
			unit: {
				preserveUndefined: true
			}
		},
		normalize: (schema) => schema,
		intersections: {
			unit: (l, r) => Disjoint.from("unit", l, r),
			default: (l, r) =>
				r.allows(l.unit as never)
					? l
					: Disjoint.from("assignability", l.unit, r)
		},
		describeExpected(inner) {
			return printable(inner.unit)
		}
	}

	serializedValue = compileSerializedValue(this.unit)
	traverseAllows = (data: unknown) => data === this.unit

	basisName = printable(this.unit)
	domain = domainOf(this.unit)
	compiledCondition = `${this.$.dataName} === ${this.serializedValue}`
	compiledNegation = `${this.$.dataName} !== ${this.serializedValue}`
}