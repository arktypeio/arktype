import { domainOf, printable } from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { compileSerializedValue } from "../traversal/registry.js"
import { BaseBasis } from "./basis.js"

export type UnitSchema<value = unknown> = UnitInner<value>

export interface UnitInner<value = unknown> extends BaseMeta {
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
	disjoinable: true
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

	// TODO:
	// default: (l, r) =>
	// r.allows(l.unit as never)
	// 	? l
	// 	: Disjoint.from("assignability", l.unit, r)

	protected intersectOwnInner(r: UnitNode) {
		return Disjoint.from("unit", this, r)
	}
}
