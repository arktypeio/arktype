import {
	type array,
	isKeyOf,
	type propValueOf,
	type satisfy,
	throwParseError
} from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.ts"
import type {
	Declaration,
	nodeOfKind,
	NodeSchema,
	NormalizedSchema
} from "../kinds.ts"
import type {
	BaseNodeDeclaration,
	BaseNormalizedSchema
} from "../shared/declare.ts"
import type { keySchemaDefinitions } from "../shared/implement.ts"
import type { After } from "./after.ts"
import type { Before } from "./before.ts"
import type { RangeKind } from "./kinds.ts"
import type { MaxLength } from "./maxLength.ts"
import type { MinLength } from "./minLength.ts"

export interface BaseRangeDeclaration extends BaseNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
	normalizedSchema: UnknownExpandedRangeSchema
}

export abstract class BaseRange<
	d extends BaseRangeDeclaration
> extends InternalPrimitiveConstraint<d> {
	declare readonly exclusive?: true

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
	readonly rule: LimitValue
}

export type LimitValue = Date | number

export type LimitSchemaValue = Date | number | string

export type LimitInnerValue<kind extends RangeKind = RangeKind> =
	kind extends "before" | "after" ? Date : number

export interface UnknownExpandedRangeSchema extends BaseNormalizedSchema {
	readonly rule: LimitSchemaValue
	readonly exclusive?: boolean
}

export interface UnknownNormalizedRangeSchema extends BaseNormalizedSchema {
	readonly rule: LimitSchemaValue
}

export type UnknownRangeSchema = LimitSchemaValue | UnknownExpandedRangeSchema

export interface ExclusiveExpandedDateRangeSchema extends BaseNormalizedSchema {
	rule: LimitSchemaValue
	exclusive?: true
}

export type ExclusiveDateRangeSchema =
	| LimitSchemaValue
	| ExclusiveExpandedDateRangeSchema

export interface InclusiveExpandedDateRangeSchema extends BaseNormalizedSchema {
	rule: LimitSchemaValue
	exclusive?: false
}

export type InclusiveDateRangeSchema =
	| LimitSchemaValue
	| InclusiveExpandedDateRangeSchema

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

export const parseExclusiveKey: keySchemaDefinitions<
	Declaration<"min" | "max">
>["exclusive"] = {
	// omit key with value false since it is the default
	parse: (flag: boolean) => flag || undefined
}

export const createLengthSchemaNormalizer =
	<kind extends "minLength" | "maxLength">(kind: kind) =>
	(schema: NodeSchema<kind>): NormalizedSchema<kind> => {
		if (typeof schema === "number") return { rule: schema }
		const { exclusive, ...normalized } = schema as
			| MinLength.ExpandedSchema
			| MaxLength.ExpandedSchema
		return exclusive ?
				{
					...normalized,
					rule: kind === "minLength" ? normalized.rule + 1 : normalized.rule - 1
				}
			:	normalized
	}

export const createDateSchemaNormalizer =
	<kind extends DateRangeKind>(kind: kind) =>
	(schema: NodeSchema<kind>): NormalizedSchema<kind> => {
		if (
			typeof schema === "number" ||
			typeof schema === "string" ||
			schema instanceof Date
		)
			return { rule: schema }

		const { exclusive, ...normalized } = schema as
			| After.ExpandedSchema
			| Before.ExpandedSchema
		if (!exclusive) return normalized
		const numericLimit =
			typeof normalized.rule === "number" ? normalized.rule
			: typeof normalized.rule === "string" ?
				new Date(normalized.rule).valueOf()
			:	normalized.rule.valueOf()

		return exclusive ?
				{
					...normalized,
					rule: kind === "after" ? numericLimit + 1 : numericLimit - 1
				}
			:	normalized
	}

export const parseDateLimit = (limit: LimitSchemaValue): Date =>
	typeof limit === "string" || typeof limit === "number" ?
		new Date(limit)
	:	limit

export type LengthBoundKind = "minLength" | "maxLength" | "exactLength"

export const writeInvalidLengthBoundMessage = (
	kind: LengthBoundKind,
	limit: number
): string => `${kind} bound must be a positive integer (was ${limit})`

export const createLengthRuleParser =
	(kind: LengthBoundKind) =>
	(limit: number): number | undefined => {
		if (!Number.isInteger(limit) || limit < 0)
			throwParseError(writeInvalidLengthBoundMessage(kind, limit))
		return limit
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
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be exactly one of number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be exactly one of number, string, Array, or Date`
