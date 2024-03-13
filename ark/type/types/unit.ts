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
	errorContext: UnitInner
}>

export class UnitNode<t = unknown, $ = any> extends BaseBasis<
	t,
	UnitDeclaration,
	$
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
			description(node) {
				return printable(node.unit)
			}
		},
		intersections: {
			unit: (l, r) => Disjoint.from("unit", l, r),
			...defineRightwardIntersections("unit", (l, r) =>
				r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
			)
		}
	})

	traverseAllows =
		this.unit instanceof Date
			? (data: unknown) =>
					data instanceof Date && data.toISOString() === this.serializedValue
			: (data: unknown) => data === this.unit

	readonly serializedValue: string | number | boolean | null =
		typeof this.unit === "string" || this.unit instanceof Date
			? JSON.stringify((this.json as any).unit)
			: (this.json as any).unit

	readonly compiledCondition = compileComparison(this)
	readonly compiledNegation = compileComparison(this, "negated")

	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = printable(this.unit)
	readonly domain = domainOf(this.unit)
}

const compileComparison = (unit: UnitNode<any>, negated?: "negated") => {
	if (unit.unit instanceof Date) {
		const condition = `${jsData} instanceof Date && ${jsData}.toISOString() === ${unit.serializedValue}`
		return negated ? `!(${condition})` : condition
	}
	return `${jsData} ${negated ? "!" : "="}== ${unit.serializedValue}`
}
