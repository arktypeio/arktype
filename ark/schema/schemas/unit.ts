import {
	type array,
	type Domain,
	type JsonPrimitive,
	type Key,
	domainOf,
	printable,
	prototypeKeysOf
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	type PrimitiveAttachments,
	defaultValueSerializer,
	derivePrimitiveAttachments,
	implementNode
} from "../shared/implement.js"
import {
	type RawSchema,
	type RawSchemaAttachments,
	defineRightwardIntersections
} from "./schema.js"

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
	},
	construct: (self) => {
		const compiledValue: JsonPrimitive = (self.json as any).unit
		const serializedValue: JsonPrimitive =
			typeof self.unit === "string" || self.unit instanceof Date ?
				JSON.stringify(compiledValue)
			:	compiledValue
		const literalKeys = prototypeKeysOf(self.unit)
		return derivePrimitiveAttachments<UnitDeclaration>(self, {
			compiledValue,
			serializedValue,
			compiledCondition: compileEqualityCheck(self.unit, serializedValue),
			compiledNegation: compileEqualityCheck(
				self.unit,
				serializedValue,
				"negated"
			),
			expression: printable(self.unit),
			domain: domainOf(self.unit),
			literalKeys,
			traverseAllows:
				self.unit instanceof Date ?
					(data: unknown) =>
						data instanceof Date && data.toISOString() === compiledValue
				:	(data: unknown) => data === self.unit,
			rawKeyOf: () => self.$.units(literalKeys) as never
		})
	}
})

export type UnitNode = RawSchema<UnitDeclaration>

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
