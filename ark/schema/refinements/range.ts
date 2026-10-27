import {
	isKeyOf,
	printDecimal,
	throwParseError,
	type array,
	type propValueOf,
	type satisfy
} from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { nodeOfKind } from "../kinds.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNodeDeclaration, BaseNodeInput } from "../shared/declare.ts"
import type { RangeKind } from "./kinds.ts"

export interface BaseRangeDeclaration extends BaseNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
}

export abstract class BaseRange<
	d extends BaseRangeDeclaration
> extends InternalPrimitiveConstraint<d> {
	declare readonly exclusive?: true

	constructor(
		...args: ConstructorParameters<typeof InternalPrimitiveConstraint>
	) {
		super(...args)
		if (this.operandKind === "length")
			assertLengthRule(this.kind as LengthBoundKind, this.rule as number)
	}

	get operandKind(): OperandKindsByBoundKind[d["kind"]] {
		return operandKindsByBoundKind[this.kind]
	}

	get comparator(): RelativeComparator {
		return compileComparator(this.kind, this.exclusive)
	}

	/** its rule as a number, a Date's time where it's a Date */
	get numRule(): number {
		return this.rule.valueOf()
	}

	readonly expression: string = `${this.comparator} ${
		this.operandKind === "date" ?
			`d'${this.stringLimit}'`
		:	printDecimal(this.rule as number)
	}`

	get limitKind(): LimitKind {
		return this.comparator["0"] === "<" ? "upper" : "lower"
	}

	compileCondition(js: NodeCompiler, data: string): string {
		const actual =
			this.operandKind === "value" ? data
			: this.operandKind === "length" ? `${data}.length`
			: `${data}.valueOf()`
		return `${actual} ${this.comparator} ${this.numRule}`
	}

	get stringLimit(): string {
		return this.operandKind === "date" ?
				dateLimitToString(this.numRule)
			:	`${this.numRule}`
	}

	isStricterThan(
		r: nodeOfKind<d["kind"] | pairedRangeKind<d["kind"]>>
	): boolean {
		const thisLimitIsStricter =
			this.limitKind === "upper" ?
				this.numRule < r.numRule
			:	this.numRule > r.numRule
		return (
			thisLimitIsStricter ||
			(this.numRule === r.numRule && this.exclusive === true && !r.exclusive)
		)
	}

	overlapsRange(r: nodeOfKind<pairedRangeKind<d["kind"]>>): boolean {
		if (this.isStricterThan(r)) return false
		if (this.numRule === r.numRule && (this.exclusive || r.exclusive))
			return false
		return true
	}

	overlapIsUnit(r: nodeOfKind<pairedRangeKind<d["kind"]>>): boolean {
		return this.numRule === r.numRule && !this.exclusive && !r.exclusive
	}
}

export interface BaseRangeInner {
	readonly rule: LimitValue
}

export type LimitValue = Date | number

export type LimitSchemaValue = Date | number | string

export type LimitInnerValue<kind extends RangeKind = RangeKind> =
	kind extends "before" | "after" ? Date : number

export interface UnknownExpandedRangeSchema extends BaseNodeInput {
	readonly rule: LimitSchemaValue
	readonly exclusive?: boolean
}

export type UnknownRangeSchema = LimitSchemaValue | UnknownExpandedRangeSchema

export interface ExclusiveExpandedDateRangeSchema extends BaseNodeInput {
	rule: LimitSchemaValue
	exclusive?: true
}

export type ExclusiveDateRangeSchema =
	| LimitSchemaValue
	| ExclusiveExpandedDateRangeSchema

export interface InclusiveExpandedDateRangeSchema extends BaseNodeInput {
	rule: LimitSchemaValue
	exclusive?: false
}

export type InclusiveDateRangeSchema =
	| LimitSchemaValue
	| InclusiveExpandedDateRangeSchema

export interface ExclusiveNormalizedNumericRangeSchema extends BaseNodeInput {
	rule: number
	exclusive?: true
}

export type ExclusiveNumericRangeSchema =
	| number
	| ExclusiveNormalizedNumericRangeSchema

export interface InclusiveNormalizedNumericRangeSchema extends BaseNodeInput {
	rule: number
	exclusive?: false
}

export type InclusiveNumericRangeSchema =
	| number
	| InclusiveNormalizedNumericRangeSchema

export type LimitKind = "lower" | "upper"

export type RelativeComparator<kind extends LimitKind = LimitKind> = {
	lower: ">" | ">="
	upper: "<" | "<="
}[kind]

export const boundKindPairsByLower: BoundKindPairsByLower = {
	min: "max",
	minLength: "maxLength",
	after: "before"
}

type BoundKindPairsByLower = {
	min: "max"
	minLength: "maxLength"
	after: "before"
}

type BoundKindPairsByUpper = {
	max: "min"
	maxLength: "minLength"
	before: "after"
}

export type pairedRangeKind<kind extends RangeKind> =
	kind extends LowerBoundKind ? BoundKindPairsByLower[kind]
	:	BoundKindPairsByUpper[kind & UpperBoundKind]

export type LowerBoundKind = keyof typeof boundKindPairsByLower

export type LowerNode = nodeOfKind<LowerBoundKind>

export type UpperBoundKind = propValueOf<typeof boundKindPairsByLower>

export type UpperNode = nodeOfKind<UpperBoundKind>

export type NumericallyBoundable = string | number | array

export type Boundable = NumericallyBoundable | Date

export type LengthBoundKind =
	| "minLength"
	| "maxLength"
	| "exactLength"
	| "notEqualLength"

export const writeInvalidLengthBoundMessage = (
	kind: LengthBoundKind,
	limit: number
): string => `${kind} bound must be a positive integer (was ${limit})`

export const assertLengthRule = (kind: LengthBoundKind, rule: number): void => {
	if (!Number.isInteger(rule) || rule < 0)
		throwParseError(writeInvalidLengthBoundMessage(kind, rule))
}

type OperandKindsByBoundKind = satisfy<
	Record<RangeKind, BoundOperandKind>,
	{
		min: "value"
		max: "value"
		minLength: "length"
		maxLength: "length"
		after: "date"
		before: "date"
	}
>

const operandKindsByBoundKind: OperandKindsByBoundKind = {
	min: "value",
	max: "value",
	minLength: "length",
	maxLength: "length",
	after: "date",
	before: "date"
} as const

export const compileComparator = (
	kind: RangeKind,
	exclusive: boolean | undefined
): RelativeComparator =>
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${
		exclusive ? "" : "="
	}` as const

export type BoundOperandKind = "value" | "length" | "date"

export type LengthBoundableData = string | array

export type DateRangeKind = "before" | "after"

export const dateLimitToString = (limit: LimitSchemaValue): string =>
	typeof limit === "string" ? limit : new Date(limit).toISOString()

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be exactly one of number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be exactly one of number, string, Array, or Date`
