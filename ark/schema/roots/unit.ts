import {
	domainDescriptions,
	domainOf,
	hasDomain,
	printable,
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
	unit instanceof Date ? unit.toISOString()
	: hasDomain(unit, "object") || typeof unit === "symbol" ?
		registeredReference(unit)
	:	(defaultValueSerializer(unit) as JsonPrimitive)

const implementation: nodeImplementationOf<Unit.Declaration> =
	implementNode<Unit.Declaration>({
		kind: "unit",
		hasAssociatedError: true,
		keys: {
			unit: {
				preserveUndefined: true,
				serialize: serializeUnit
			}
		},
		defaults: {
			description: node => printable(node.unit, { ownDataOnly: true }),
			problem: ({ expected, actual }) =>
				`${expected === actual ? `must be reference equal to ${expected} (serialized to the same value)` : `must be ${expected} (was ${actual})`}`
		}
	})

export class UnitNode extends InternalBasis<Unit.Declaration> {
	compiledValue: JsonPrimitive = serializeUnit(this.unit)
	serializedValue: string =
		this.unit instanceof Date ?
			JSON.stringify(this.compiledValue)
		:	compileSerializedValue(this.unit)

	compiledCondition: string = compileEqualityCheck(
		this.unit,
		this.serializedValue
	)
	compiledNegation: string = compileEqualityCheck(
		this.unit,
		this.serializedValue,
		"negated"
	)

	compile(js: NodeCompiler): void {
		if (
			this.unit instanceof Date ||
			(!hasDomain(this.unit, "object") && typeof this.unit !== "symbol")
		)
			return super.compile(js)
		const unit = js.ref(this.unit)
		if (js.traversalKind === "Allows") js.return(`data === ${unit}`)
		else {
			js.if(`data !== ${unit}`, () =>
				js.line(
					`ctx.errorFromNodeContext(${js.errorContext(this.errorContext!)}, data)`
				)
			)
		}
	}

	expression: string =
		this.unit instanceof Date ?
			`d'${this.compiledValue}'`
		:	printable(this.unit, { ownDataOnly: true })
	domain: Domain = domainOf(this.unit)

	get defaultShortDescription(): string {
		return this.domain === "object" ?
				domainDescriptions.object
			:	this.description
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
