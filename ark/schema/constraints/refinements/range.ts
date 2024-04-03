import {
	invert,
	isKeyOf,
	type array,
	type PartialRecord,
	type valueOf
} from "@arktype/util"
import type { Node } from "../../base.js"
import type { BaseMeta, BaseNodeDeclaration } from "../../shared/declare.js"
import type { KeyDefinitions, RangeKind } from "../../shared/implement.js"
import { BasePrimitiveConstraint } from "../constraint.js"

export abstract class BaseRange<
	d extends BaseRangeDeclaration
> extends BasePrimitiveConstraint<d> {
	readonly boundOperandKind = operandKindsByBoundKind[this.kind]
	readonly compiledActual =
		this.boundOperandKind === "value"
			? `data`
			: this.boundOperandKind === "length"
			? `data.length`
			: `data.valueOf()`
	readonly comparator = compileComparator(this.kind, this.exclusive)
	readonly numericLimit = this.rule.valueOf()
	readonly expression = `${this.comparator}${this.rule}`
	readonly compiledCondition = `${this.compiledActual} ${this.comparator} ${this.numericLimit}`
	readonly compiledNegation = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.numericLimit}`

	// we need to compute stringLimit before errorContext, which references it
	// transitively through description for date bounds
	readonly stringLimit =
		this.boundOperandKind === "date"
			? dateLimitToString(this.numericLimit)
			: `${this.numericLimit}`
	readonly errorContext = this.createErrorContext(this.inner)
	readonly limitKind: LimitKind =
		this.comparator["0"] === "<" ? "upper" : "lower"

	isStricterThan(r: Node<d["kind"] | pairedRangeKind<d["kind"]>>): boolean {
		const thisLimitIsStricter =
			this.limitKind === "upper"
				? this.numericLimit < r.numericLimit
				: this.numericLimit > r.numericLimit
		return (
			thisLimitIsStricter ||
			(this.numericLimit === r.numericLimit &&
				this.exclusive === true &&
				!r.exclusive)
		)
	}

	overlapsRange(r: Node<pairedRangeKind<d["kind"]>>): boolean {
		if (this.isStricterThan(r)) return false
		if (this.numericLimit === r.numericLimit && (this.exclusive || r.exclusive))
			return false
		return true
	}

	overlapIsUnit(r: Node<pairedRangeKind<d["kind"]>>): boolean {
		return (
			this.numericLimit === r.numericLimit && !this.exclusive && !r.exclusive
		)
	}
}

export interface BaseRangeInner extends BaseMeta {
	readonly rule: number | Date
	readonly exclusive?: true
}

export type LimitSchemaValue<kind extends RangeKind = RangeKind> = kind extends
	| "before"
	| "after"
	? Date | number | string
	: number

export type LimitInnerValue<kind extends RangeKind = RangeKind> = kind extends
	| "before"
	| "after"
	? Date
	: number

export interface BaseNormalizedRangeSchema extends BaseMeta {
	readonly exclusive?: boolean
}

export type LimitKind = "lower" | "upper"

export type RelativeComparator<kind extends LimitKind = LimitKind> = {
	lower: ">" | ">="
	upper: "<" | "<="
}[kind]

export const negatedComparators = {
	"<": ">=",
	"<=": ">",
	">": "<=",
	">=": "<"
} as const satisfies Record<RelativeComparator, RelativeComparator>

export const boundKindPairsByLower = {
	min: "max",
	minLength: "maxLength",
	after: "before"
} as const satisfies PartialRecord<RangeKind, RangeKind>

type BoundKindPairsByLower = typeof boundKindPairsByLower

export const boundKindPairsByUpper = invert(boundKindPairsByLower)

type BoundKindPairsByUpper = typeof boundKindPairsByUpper

export type pairedRangeKind<kind extends RangeKind> =
	kind extends LowerBoundKind
		? BoundKindPairsByLower[kind]
		: BoundKindPairsByUpper[kind & UpperBoundKind]

export type LowerBoundKind = keyof typeof boundKindPairsByLower

export type LowerNode = Node<LowerBoundKind>

export type UpperBoundKind = valueOf<typeof boundKindPairsByLower>

export type UpperNode = Node<UpperBoundKind>

export type NumericallyBoundable = string | number | array

export type Boundable = NumericallyBoundable | Date

export const parseExclusiveKey: KeyDefinitions<BaseRangeDeclaration>["exclusive"] =
	{
		// omit key with value false since it is the default
		parse: (flag: boolean) => flag || undefined
	}

export const parseDateLimit = (limit: LimitSchemaValue): Date =>
	typeof limit === "string" || typeof limit === "number"
		? new Date(limit)
		: limit

export interface BaseRangeDeclaration extends BaseNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
	normalizedDef: BaseNormalizedRangeSchema
}

export const operandKindsByBoundKind = {
	min: "value",
	max: "value",
	minLength: "length",
	maxLength: "length",
	after: "date",
	before: "date"
} as const satisfies Record<RangeKind, BoundOperandKind>

export const compileComparator = (
	kind: RangeKind,
	exclusive: boolean | undefined
) =>
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
