import {
	invert,
	isKeyOf,
	type List,
	type PartialRecord,
	type valueOf
} from "@arktype/util"
import type { Node } from "../../base.js"
import type { Schema } from "../../kinds.js"
import { jsData } from "../../shared/compile.js"
import type { BaseMeta, BaseNodeDeclaration } from "../../shared/declare.js"
import type { KeyDefinitions } from "../../shared/implement.js"
import type { DateLiteral, normalizePrimitiveConstraintSchema } from "../ast.js"
import { BasePrimitiveConstraint } from "../constraint.js"
import type { BoundKind, RangeKind } from "./shared.js"

export abstract class BaseRange<
	d extends BaseRangeDeclaration
> extends BasePrimitiveConstraint<d> {
	readonly limit: LimitInnerValue<d["kind"]> = (this as any)[this.kind]
	readonly boundOperandKind = operandKindsByBoundKind[this.kind]
	readonly compiledActual =
		this.boundOperandKind === "value"
			? `${jsData}`
			: this.boundOperandKind === "length"
			? `${jsData}.length`
			: `${jsData}.valueOf()`
	readonly comparator = compileComparator(this.kind, this.exclusive)
	readonly numericLimit = this.limit.valueOf()
	readonly expression = `${this.comparator}${this.limit}`
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
			(this.numericLimit === r.numericLimit && this.exclusive && !r.exclusive)
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

export type NumericallyBoundable = string | number | List

export type Boundable = NumericallyBoundable | Date

export const parseExclusiveKey: KeyDefinitions<BaseRangeDeclaration>["exclusive"] =
	{
		// omit key with value false since it is the default
		parse: (flag: boolean) => flag || undefined
	}

export const parseDateLimit = {
	parse: (limit: LimitSchemaValue): Date =>
		typeof limit === "string" || typeof limit === "number"
			? new Date(limit)
			: limit
}

export interface BaseRangeDeclaration extends BaseNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
	normalizedSchema: BaseNormalizedRangeSchema
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

export type LengthBoundableData = string | List

export type DateRangeKind = "before" | "after"

export const dateLimitToString = (limit: LimitSchemaValue): string =>
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export type boundToIs<
	kind extends BoundKind,
	schema extends Schema<BoundKind>
> = {
	[_ in schemaToComparator<kind, schema>]: limitToIs<
		normalizePrimitiveConstraintSchema<schema>
	>
}

export type limitToIs<limit> = limit extends DateLiteral<infer source>
	? string extends source
		? Date
		: source
	: string extends limit
	? Date
	: limit

type schemaToComparator<
	kind extends BoundKind,
	schema extends Schema<BoundKind>
> = `${kind extends LowerBoundKind ? ">" : "<"}${schema extends {
	exclusive: true
}
	? ""
	: "="}`

export type isNarrowedLimit<limit> = limit extends number
	? number extends limit
		? false
		: true
	: limit extends DateLiteral<infer source>
	? string extends source
		? false
		: true
	: false

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
