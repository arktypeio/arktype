import {
	type array,
	type Domain,
	type JsonPrimitive,
	type Key,
	domainOf,
	printable,
	prototypeKeysOf
} from "@arktype/util"
import type { RawSchemaAttachments } from "../schema.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type PrimitiveAttachments,
	defaultValueSerializer,
	implementNode
} from "../shared/implement.js"
import { RawBasis } from "./basis.js"
import { defineRightwardIntersections } from "./utils.js"

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
	attachments: UnitAttachments
}>

export interface UnitAttachments
	extends RawSchemaAttachments<UnitDeclaration>,
		PrimitiveAttachments<UnitDeclaration> {
	readonly literalKeys: array<Key>
	readonly domain: Domain
	readonly compiledValue: JsonPrimitive
	readonly serializedValue: JsonPrimitive
}

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
