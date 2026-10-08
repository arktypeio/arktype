import {
	type array,
	isKeyOf,
	type propValueOf,
	type satisfy,
	throwParseError
} from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { nodeOfKind } from "../kinds.ts"
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
		if (this.boundOperandKind === "length")
			assertLengthRule(this.kind as LengthBoundKind, this.rule as number)
	}

	readonly boundOperandKind: OperandKindsByBoundKind[d["kind"]] =
		operandKindsByBoundKind[this.kind]
	readonly compiledActual: string =
		this.boundOperandKind === "value" ? `data`
		: this.boundOperandKind === "length" ? `data.length`
		: `data.valueOf()`
	readonly comparator: RelativeComparator = compileComparator(
		this.kind,
		this.exclusive
	)
	readonly numericLimit: number = this.rule.valueOf()
	readonly expression: string = `${this.comparator} ${
		this.boundOperandKind === "date" ? `d'${this.stringLimit}'` : this.rule
	}`
	readonly compiledCondition: string = `${this.compiledActual} ${this.comparator} ${this.numericLimit}`
	readonly compiledNegation: string = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.numericLimit}`
	readonly limitKind: LimitKind =
		this.comparator["0"] === "<" ? "upper" : "lower"

	get stringLimit(): string {
		return this.boundOperandKind === "date" ?
				dateLimitToString(this.numericLimit)
			:	`${this.numericLimit}`
	}

	isStricterThan(
		r: nodeOfKind<d["kind"] | pairedRangeKind<d["kind"]>>
	): boolean {
		const thisLimitIsStricter =
			this.limitKind === "upper" ?
				this.numericLimit < r.numericLimit
			:	this.numericLimit > r.numericLimit
		return (
			thisLimitIsStricter ||
			(this.numericLimit === r.numericLimit &&
				this.exclusive === true &&
				!r.exclusive)
		)
	}

	overlapsRange(r: nodeOfKind<pairedRangeKind<d["kind"]>>): boolean {
		if (this.isStricterThan(r)) return false
		if (this.numericLimit === r.numericLimit && (this.exclusive || r.exclusive))
			return false
		return true
	}

	overlapIsUnit(r: nodeOfKind<pairedRangeKind<d["kind"]>>): boolean {
		return (
			this.numericLimit === r.numericLimit && !this.exclusive && !r.exclusive
		)
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

const negatedComparators = {
	"<": ">=",
	"<=": ">",
	">": "<=",
	">=": "<"
} as const satisfies Record<RelativeComparator, RelativeComparator>

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

export type LengthBoundKind = "minLength" | "maxLength" | "exactLength"

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
