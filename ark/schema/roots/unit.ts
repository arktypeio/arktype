import {
	domainDescriptions,
	domainOf,
	printable,
	prototypeKeysOf,
	type Domain,
	type JsonPrimitive,
	type Key,
	type array
} from "@ark/util"
import type {
	BaseInner,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { InternalBasis } from "./basis.js"
import { defineRightwardIntersections } from "./utils.js"

export namespace Unit {
	export interface Schema<value = unknown> extends BaseNormalizedSchema {
		readonly unit: value
	}

	export interface Inner<value = unknown> extends BaseInner {
		readonly unit: value
	}

	export interface ErrorContext<value = unknown> extends Inner<value> {}

	export interface Declaration
		extends declareNode<{
			kind: "unit"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			errorContext: Inner
		}> {}

	export type Node = UnitNode
}

const implementation: nodeImplementationOf<Unit.Declaration> =
	implementNode<Unit.Declaration>({
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
			description: node => printable(node.unit),
			problem: ({ expected, actual }) =>
				`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
		},
		intersections: {
			unit: (l, r) => Disjoint.init("unit", l, r),
			...defineRightwardIntersections("unit", (l, r) =>
				r.allows(l.unit) ? l : (
					Disjoint.init(
						"assignability",
						l,
						r.hasKind("intersection") ?
							r.children.find(
								rConstraint => !rConstraint.allows(l.unit as never)
							)!
						:	r
					)
				)
			)
		}
	})

export class UnitNode extends InternalBasis<Unit.Declaration> {
	compiledValue: JsonPrimitive = (this.json as any).unit
	serializedValue: JsonPrimitive =
		typeof this.unit === "string" || this.unit instanceof Date ?
			JSON.stringify(this.compiledValue)
		:	this.compiledValue
	literalKeys: array<Key> = prototypeKeysOf(this.unit)

	compiledCondition: string = compileEqualityCheck(
		this.unit,
		this.serializedValue
	)
	compiledNegation: string = compileEqualityCheck(
		this.unit,
		this.serializedValue,
		"negated"
	)
	expression: string = printable(this.unit)
	domain: Domain = domainOf(this.unit)
	get shortDescription(): string {
		return this.domain === "object" ?
				domainDescriptions.object
			:	this.description
	}

	traverseAllows: TraverseAllows =
		this.unit instanceof Date ?
			data => data instanceof Date && data.toISOString() === this.compiledValue
		:	data => data === this.unit
}

export const Unit = {
	implementation,
	Node: UnitNode
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
