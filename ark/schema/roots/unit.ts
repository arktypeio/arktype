import {
	domainDescriptions,
	domainOf,
	hasDomain,
	isDate,
	printable,
	printDecimal,
	timeOf,
	type Domain,
	type JsonPrimitive
} from "@ark/util"
import { compileSerializedValue, type NodeCompiler } from "../shared/compile.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
import {
	defaultValueSerializer,
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { registeredReference } from "../shared/registry.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export declare namespace Unit {
	export interface Inner<value = unknown> {
		readonly unit: value
	}

	export interface ErrorContext<value = unknown>
		extends BaseErrorContext<"unit">,
			Inner<value> {}

	export interface Declaration
		extends declareNode<{
			kind: "unit"
			inner: Inner
			errorContext: ErrorContext
		}> {}

	export type Node = UnitNode
}

const serializeUnit = (unit: unknown): JsonPrimitive =>
	isDate(unit) ? unit.toISOString()
	: hasDomain(unit, "object") || typeof unit === "symbol" ?
		registeredReference(unit)
	:	(defaultValueSerializer(unit) as JsonPrimitive)

const implementation: nodeImplementationOf<Unit.Declaration> =
	implementNode<Unit.Declaration>({
		kind: "unit",
		ownsError: true,
		keys: {
			unit: {
				preserveUndefined: true,
				serialize: serializeUnit
			}
		},
		defaults: {
			description: node => printable(node.unit, { ownDataOnly: true })
		}
	})

export class UnitNode extends InternalBasis<Unit.Declaration> {
	compiledValue: JsonPrimitive = serializeUnit(this.unit)
	serializedUnit: string =
		isDate(this.unit) ?
			JSON.stringify(this.compiledValue)
		:	compileSerializedValue(this.unit)

	compileCondition(js: NodeCompiler, data: string): string {
		return (
			isDate(this.unit) ?
				`${data} instanceof Date && ${js.ref(timeOf)}(${data}) === ${(this.unit as Date).getTime()}`
			: Number.isNaN(this.unit) ? `Number.isNaN(${data})`
			: hasDomain(this.unit, "object") || typeof this.unit === "symbol" ?
				`${data} === ${js.ref(this.unit)}`
			:	`${data} === ${this.serializedUnit}`
		)
	}

	expression: string =
		isDate(this.unit) ? `d'${this.compiledValue}'`
		: typeof this.unit === "number" ? printDecimal(this.unit)
		: printable(this.unit, { ownDataOnly: true })
	domain: Domain = domainOf(this.unit)

	get defaultBrief(): string {
		return this.domain === "object" ?
				domainDescriptions.object
			:	this.description
	}

	traverseAllows: TraverseAllows =
		isDate(this.unit) ?
			data =>
				data instanceof Date && timeOf(data) === (this.unit as Date).getTime()
		: Number.isNaN(this.unit) ? data => Number.isNaN(data)
		: data => data === this.unit
}

export const Unit = {
	implementation,
	Node: UnitNode
}
