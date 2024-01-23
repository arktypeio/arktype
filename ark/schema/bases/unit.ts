import { domainOf, printable } from "@arktype/util"
import type { declareNode, withBaseMeta } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { compileSerializedValue } from "../traversal/registry.js"
import { BaseBasis } from "./basis.js"

export type UnitSchema<value = unknown> = UnitInner<value>

export type UnitInner<value = unknown> = withBaseMeta<{
	readonly unit: value
}>

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
	static implementation = this.implement({
		hasAssociatedError: true,
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
		defaults: {
			description(inner) {
				return printable(inner.unit)
			}
		}
	})

	serializedValue = compileSerializedValue(this.unit)
	traverseAllows = (data: unknown) => data === this.unit

	basisName = printable(this.unit)
	domain = domainOf(this.unit)
	compiledCondition = `${this.$.dataArg} === ${this.serializedValue}`
	compiledNegation = `${this.$.dataArg} !== ${this.serializedValue}`
}
