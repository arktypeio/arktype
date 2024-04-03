import { domainOf, printable, prototypeKeysOf } from "@arktype/util"
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

export class UnitNode<t = any, $ = any> extends BaseBasis<
	t,
	$,
	UnitDeclaration
> {
	static implementation = this.implement({
		kind: "unit",
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
					data instanceof Date && data.toISOString() === this.compiledValue
			: (data: unknown) => data === this.unit

	readonly compiledValue: string | number | boolean | null = (this.json as any)
		.unit
	readonly serializedValue: string | number | boolean | null =
		typeof this.unit === "string" || this.unit instanceof Date
			? JSON.stringify(this.compiledValue)
			: this.compiledValue

	readonly compiledCondition = compileComparison(this)
	readonly compiledNegation = compileComparison(this, "negated")

	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = printable(this.unit)
	readonly domain = domainOf(this.unit)
	readonly literalKeys = prototypeKeysOf(this.unit)
}

const compileComparison = (unit: UnitNode<any>, negated?: "negated") => {
	if (unit.unit instanceof Date) {
		const condition = `data instanceof Date && data.toISOString() === ${unit.serializedValue}`
		return negated ? `!(${condition})` : condition
	}
	return `data ${negated ? "!" : "="}== ${unit.serializedValue}`
}
