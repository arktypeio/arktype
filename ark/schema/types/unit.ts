import { domainOf, printable } from "@arktype/util"
import type { Node } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisKind } from "../shared/implement.js"
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
	composition: "primitive"
	disjoinable: true
	expectedContext: UnitInner
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

	serializedValue: string = (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit
	compiledCondition = `${this.$.dataArg} === ${this.serializedValue}`
	compiledNegation = `${this.$.dataArg} !== ${this.serializedValue}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	basisName = printable(this.unit)
	domain = domainOf(this.unit)

	protected intersectOwnInner(r: UnitNode) {
		return Disjoint.from("unit", this, r)
	}

	intersectRightwardInner(
		r: Node<"intersection" | BasisKind>
	): UnitInner | Disjoint {
		return r.allows(this.unit)
			? this
			: Disjoint.from("assignability", this.unit, r)
	}
}
