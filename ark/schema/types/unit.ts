import { domainOf, printable } from "@arktype/util"
import type { ConstraintNode } from "../base.js"
import { jsData } from "../shared/compile.js"
import { TraversalContext } from "../shared/context.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
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
			...defineRightwardIntersections("unit", (l, r) =>
				r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
			)
		}
	})

	serializedValue: string = (this.json as any).unit
	traverseAllows = (data: unknown) => data === this.unit
	compiledCondition = `${jsData} === ${this.serializedValue}`
	compiledNegation = `${jsData} !== ${this.serializedValue}`

	readonly expectedContext = this.createExpectedContext(this.inner)

	// applyConstraint(node: ConstraintNode) {
	// 	const allowed = node.traverseAllows(
	// 		this.unit,
	// 		new TraversalContext(this.unit, this.$.config)
	// 	)
	// 	return allowed ? this : Disjoint.from()
	// }

	basisName = printable(this.unit)
	domain = domainOf(this.unit)
}
