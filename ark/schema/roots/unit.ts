import {
	domainDescriptions,
	domainOf,
	printable,
	type Domain,
	type JsonPrimitive
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { JsonSchema } from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { ToJsonSchema } from "../shared/toJsonSchema.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export declare namespace Unit {
	export interface Schema<value = unknown> extends BaseNormalizedSchema {
		readonly unit: value
	}

	export interface Inner<value = unknown> {
		readonly unit: value
	}

	export interface ErrorContext<value = unknown>
		extends BaseErrorContext<"unit">,
			Inner<value> {}

	export interface Declaration
		extends declareNode<{
			kind: "unit"
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
			errorContext: ErrorContext
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
		}
	})

export class UnitNode extends InternalBasis<Unit.Declaration> {
	compiledValue: JsonPrimitive = (this.json as any).unit
	serializedValue: string =
		typeof this.unit === "string" || this.unit instanceof Date ?
			JSON.stringify(this.compiledValue)
		:	`${this.compiledValue}`

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

	get defaultShortDescription(): string {
		return this.domain === "object" ?
				domainDescriptions.object
			:	this.description
	}

	protected innerToJsonSchema(ctx: ToJsonSchema.Context): JsonSchema {
		return (
			// this is the more standard JSON schema representation, especially for Open API
			this.unit === null ? { type: "null" }
			: $ark.intrinsic.jsonPrimitive.allows(this.unit) ? { const: this.unit }
			: ctx.fallback.unit({ code: "unit", base: {}, unit: this.unit })
		)
	}

	traverseAllows: TraverseAllows =
		this.unit instanceof Date ?
			data => data instanceof Date && data.toISOString() === this.compiledValue
		: Number.isNaN(this.unit) ? data => Number.isNaN(data)
		: data => data === this.unit
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

	if (Number.isNaN(unit)) return `${negated ? "!" : ""}Number.isNaN(data)`

	return `data ${negated ? "!" : "="}== ${serializedValue}`
}
