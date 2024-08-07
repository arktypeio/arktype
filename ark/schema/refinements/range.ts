import { type array, isKeyOf, type propValueOf, type satisfy } from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.js"
import type { nodeOfKind } from "../kinds.js"
import type {
	BaseNodeDeclaration,
	BaseNormalizedSchema
} from "../shared/declare.js"
import type { keySchemaDefinitions, RangeKind } from "../shared/implement.js"

export interface BaseRangeDeclaration extends BaseNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
	normalizedSchema: UnknownNormalizedRangeSchema
}

export abstract class BaseRange<
	d extends BaseRangeDeclaration
> extends InternalPrimitiveConstraint<d> {
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
	readonly expression: string = `${this.comparator} ${this.rule}`
	readonly compiledCondition: string = `${this.compiledActual} ${this.comparator} ${this.numericLimit}`
	readonly compiledNegation: string = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.numericLimit}`

	// we need to compute stringLimit before errorContext, which references it
	// transitively through description for date bounds
	readonly stringLimit: string =
		this.boundOperandKind === "date" ?
			dateLimitToString(this.numericLimit)
		:	`${this.numericLimit}`
	readonly limitKind: LimitKind =
		this.comparator["0"] === "<" ? "upper" : "lower"

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
	readonly rule: number | Date
	readonly exclusive?: true
}

export type LimitSchemaValue = Date | number | string

export type LimitInnerValue<kind extends RangeKind = RangeKind> =
	kind extends "before" | "after" ? Date : number

export interface UnknownNormalizedRangeSchema extends BaseNormalizedSchema {
	readonly rule: LimitSchemaValue
	readonly exclusive?: boolean
}

export type UnknownRangeSchema = LimitSchemaValue | UnknownNormalizedRangeSchema

export interface ExclusiveNormalizedDateRangeSchema
	extends BaseNormalizedSchema {
	rule: LimitSchemaValue
	exclusive?: true
}

export type ExclusiveDateRangeSchema =
	| LimitSchemaValue
	| ExclusiveNormalizedDateRangeSchema

export interface InclusiveNormalizedDateRangeSchema
	extends BaseNormalizedSchema {
	rule: LimitSchemaValue
	exclusive?: false
}

export type InclusiveDateRangeSchema =
	| LimitSchemaValue
	| InclusiveNormalizedDateRangeSchema

export interface ExclusiveNormalizedNumericRangeSchema
	extends BaseNormalizedSchema {
	rule: number
	exclusive?: true
}

export type ExclusiveNumericRangeSchema =
	| number
	| ExclusiveNormalizedNumericRangeSchema

export interface InclusiveNormalizedNumericRangeSchema
	extends BaseNormalizedSchema {
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

export const parseExclusiveKey: keySchemaDefinitions<BaseRangeDeclaration>["exclusive"] =
	{
		// omit key with value false since it is the default
		parse: (flag: boolean) => flag || undefined
	}

export const parseDateLimit = (limit: LimitSchemaValue): Date =>
	typeof limit === "string" || typeof limit === "number" ?
		new Date(limit)
	:	limit

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
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
