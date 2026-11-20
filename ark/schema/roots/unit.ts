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
			errorCtx: ErrorContext
		}> {}

	export type Node = UnitNode
}

const dateTimeOf = (v: unknown): number | undefined =>
	isDate(v) ? timeOf(v) : undefined

const describeUnit = (unit: unknown): string => {
	if (isDate(unit)) {
		const time = timeOf(unit)
		if (time === undefined) return printable({ ...unit }, { ownDataOnly: true })
		if (Number.isNaN(time)) return "Invalid Date"
	}
	return printable(unit, { ownDataOnly: true })
}

const serializeUnit = (unit: unknown): JsonPrimitive => {
	const time = dateTimeOf(unit)
	return (
		time !== undefined ?
			Number.isNaN(time) ?
				"Invalid Date"
			:	(unit as Date).toISOString()
		: hasDomain(unit, "object") || typeof unit === "symbol" ?
			registeredReference(unit)
		:	(defaultValueSerializer(unit) as JsonPrimitive)
	)
}

const implementation: nodeImplementationOf<Unit.Declaration> =
	implementNode<Unit.Declaration>({
		kind: "unit",
		ownErr: true,
		keys: {
			unit: {
				keepUndef: true,
				serialize: serializeUnit
			}
		},
		defaults: {
			description: node => describeUnit(node.unit)
		}
	})

export class UnitNode extends InternalBasis<Unit.Declaration> {
	/** its unit as JSON: a Date by its ISO string, an object or symbol by its registered reference */
	unitJson: JsonPrimitive = serializeUnit(this.unit)
	/** its unit written as a JavaScript literal, as compiled code compares data to it */
	jsUnit: string =
		dateTimeOf(this.unit) !== undefined ?
			JSON.stringify(this.unitJson)
		:	compileSerializedValue(this.unit)

	override sameInner(r: UnitNode): boolean {
		return this.unitJson === r.unitJson
	}

	jsCond(js: NodeCompiler, data: string): string {
		const time = dateTimeOf(this.unit)
		return (
			time !== undefined ?
				Number.isNaN(time) ?
					`${data} instanceof Date && Number.isNaN(${js.ref(timeOf)}(${data}))`
				:	`${data} instanceof Date && ${js.ref(timeOf)}(${data}) === ${time}`
			: Number.isNaN(this.unit) ? `Number.isNaN(${data})`
			: hasDomain(this.unit, "object") || typeof this.unit === "symbol" ?
				`${data} === ${js.ref(this.unit)}`
			:	`${data} === ${this.jsUnit}`
		)
	}

	expression: string =
		dateTimeOf(this.unit) !== undefined ?
			this.unitJson === "Invalid Date" ?
				"Invalid Date"
			:	`d'${this.unitJson}'`
		: typeof this.unit === "number" ? printDecimal(this.unit)
		: describeUnit(this.unit)
	domain: Domain = domainOf(this.unit)

	get brief(): string {
		return this.domain === "object" ?
				domainDescriptions.object
			:	this.description
	}

	tAllows: TraverseAllows = (() => {
		const time = dateTimeOf(this.unit)
		return (
			time !== undefined ?
				Number.isNaN(time) ?
					data => data instanceof Date && Number.isNaN(timeOf(data))
				:	data => data instanceof Date && timeOf(data) === time
			: Number.isNaN(this.unit) ? data => Number.isNaN(data)
			: data => data === this.unit
		)
	})()
}

export const Unit = {
	impl: implementation,
	Node: UnitNode
}
