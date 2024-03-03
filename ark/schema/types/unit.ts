import { domainOf, printable } from "@arktype/util"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { TypeIntersection } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"
import type { typeKindRightOf } from "./type.js"

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
	expectedContext: UnitInner
}>

const intersectRightward: TypeIntersection<"unit"> = (unit, r) =>
	r.allows(unit.unit) ? unit : Disjoint.from("assignability", unit.unit, r)

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
		},
		intersections: {
			unit: (l, r) => Disjoint.from("unit", l, r),
			intersection: intersectRightward,
			domain: intersectRightward,
			proto: intersectRightward
		}
	})

	serializedValue: string = (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit
	compiledCondition = `${jsData} === ${this.serializedValue}`
	compiledNegation = `${jsData} !== ${this.serializedValue}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	basisName = printable(this.unit)
	domain = domainOf(this.unit)
}
