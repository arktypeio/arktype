import { domainOf, printable } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"
import { defineRightwardIntersections } from "./type.js"

export type UnitSchema<value = unknown> = UnitInner<value>

export interface UnitInner<value = unknown> extends BaseMeta {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	schema: UnitSchema
	normalizedSchema: UnitSchema
	inner: UnitInner
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
				preserveUndefined: true,
				serialize: (v) =>
					v instanceof Date ? v.toISOString() : defaultValueSerializer(v)
			}
		},
		normalize: (schema) => schema,
		defaults: {
			description(inner) {
				return printable(inner.unit)
			}
		},
		intersections: {
			unit: (l, r) => Disjoint.from("unit", l, r),
			...defineRightwardIntersections("unit", (l, r) =>
				r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
			)
		}
	})

	serializedValue: string | number | boolean | null =
		typeof this.unit === "string" || this.unit instanceof Date
			? JSON.stringify((this.json as any).unit)
			: (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit
	compiledCondition = compileComparison(this, true)
	compiledNegation = compileComparison(this, false)

	readonly expectedContext = this.createExpectedContext(this.inner)

	basisName = printable(this.unit)
	domain = domainOf(this.unit)
}

const compileComparison = (unit: UnitNode<any>, negated: boolean) =>
	`${unit.unit instanceof Date ? `${jsData}.toISOString()` : jsData} ${
		negated ? "!" : "="
	}== ${unit.serializedValue}`
