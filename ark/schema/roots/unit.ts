import {
	type JsonPrimitive,
	domainOf,
	printable,
	prototypeKeysOf
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { defaultValueSerializer, implementNode } from "../shared/implement.js"
import { RawBasis } from "./basis.js"
import { defineRightwardIntersections } from "./utils.js"

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

export const unitImplementation = implementNode<UnitDeclaration>({
	kind: "unit",
	hasAssociatedError: true,
	keys: {
		unit: {
			preserveUndefined: true,
			serialize: schema =>
				schema instanceof Date ?
					schema.toISOString()
				:	defaultValueSerializer(schema)
		}
	},
	normalize: schema => schema,
	defaults: {
		description: node => printable(node.unit)
	},
	intersections: {
		unit: (l, r) => Disjoint.from("unit", l, r),
		...defineRightwardIntersections("unit", (l, r) =>
			r.allows(l.unit) ? l : Disjoint.from("assignability", l.unit, r)
		)
	}
})

export class UnitNode extends RawBasis<UnitDeclaration> {
	compiledValue: JsonPrimitive = (this.json as any).unit
	serializedValue: JsonPrimitive =
		typeof this.unit === "string" || this.unit instanceof Date ?
			JSON.stringify(this.compiledValue)
		:	this.compiledValue
	literalKeys = prototypeKeysOf(this.unit)

	compiledCondition = compileEqualityCheck(this.unit, this.serializedValue)
	compiledNegation = compileEqualityCheck(
		this.unit,
		this.serializedValue,
		"negated"
	)
	expression = printable(this.unit)
	domain = domainOf(this.unit)

	traverseAllows =
		this.unit instanceof Date ?
			(data: unknown) =>
				data instanceof Date && data.toISOString() === this.compiledValue
		:	(data: unknown) => data === this.unit
}

const compileEqualityCheck = (
	unit: unknown,
	serializedValue: JsonPrimitive,
	negated?: "negated"
) => {
	if (unit instanceof Date) {
		const condition = `data instanceof Date && data.toISOString() === ${serializedValue}`
		return negated ? `!(${condition})` : condition
	}
	return `data ${negated ? "!" : "="}== ${serializedValue}`
}
