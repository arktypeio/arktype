import { domainOf, printable, prototypeKeysOf } from "@arktype/util"
import { implementNode } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer } from "../shared/implement.js"
import { BaseBasis } from "./basis.js"
import { defineRightwardIntersections } from "./schema.js"

export type UnitDef<value = unknown> = UnitInner<value>

export interface UnitInner<value = unknown> extends BaseMeta {
	readonly unit: value
}

export type UnitDeclaration = declareNode<{
	kind: "unit"
	def: UnitDef
	normalizedDef: UnitDef
	inner: UnitInner
	errorContext: UnitInner
}>

export const unitImplementation = implementNode<UnitDeclaration>({
	kind: "unit",
	hasAssociatedError: true,
	keys: {
		unit: {
			preserveUndefined: true,
			serialize: (def) =>
				def instanceof Date ? def.toISOString() : defaultValueSerializer(def)
		}
	},
	normalize: (def) => def,
	defaults: {
		description: (node) => printable(node.unit)
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		...defineRightwardIntersections("unit", (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
		)
	}
})

export class UnitNode<t = any, $ = any> extends BaseBasis<
	t,
	$,
	UnitDeclaration
> {
	static implementation = unitImplementation

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
