import { domainOf, printable, type Constructor } from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { PrimitiveAttachmentsInput } from "../shared/implement.js"
import { BaseType, type BaseBasis } from "./type.js"

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
	attachments: PrimitiveAttachmentsInput
}>

export class UnitNode<t = unknown>
	extends BaseType<t, UnitDeclaration, typeof UnitNode>
	implements BaseBasis
{
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
		},
		attachments: (base) => {
			const serializedValue = (base.json as any).unit
			return {
				primitive: true,
				compiledCondition: `${base.$.dataArg} === ${serializedValue}`,
				compiledNegation: `${base.$.dataArg} !== ${serializedValue}`
			}
		}
	})

	readonly constraintGroup = "basis"

	serializedValue: string = (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit

	basisName = printable(this.unit)
	domain = domainOf(this.unit)

	// TODO:
	// default: (l, r) =>
	// r.allows(l.unit as never)
	// 	? l
	// 	: Disjoint.from("assignability", l.unit, r)

	protected intersectOwnInner(r: UnitNode) {
		return Disjoint.from("unit", this, r)
	}
}
