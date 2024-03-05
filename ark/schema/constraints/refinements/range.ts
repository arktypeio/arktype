import {
	invert,
	isKeyOf,
	type List,
	type PartialRecord,
	type evaluate,
	type valueOf
} from "@arktype/util"
import type { Node, NodeSubclass } from "../../base.js"
import type { Declaration, Schema } from "../../kinds.js"
import { jsData } from "../../shared/compile.js"
import type { BaseNodeDeclaration, declareNode } from "../../shared/declare.js"
import {
	throwInvalidOperandError,
	type BasisKind,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "../../shared/implement.js"
import {
	BasePrimitiveConstraint,
	type PrimitiveConstraintInner
} from "../constraint.js"
import type { DateLiteral, normalizePrimitiveConstraintSchema } from "../is.js"
import type { BoundKind, RangeKind } from "./shared.js"

export abstract class BaseRange<
	d extends BaseRangeDeclaration,
	subclass extends NodeSubclass<d>
> extends BasePrimitiveConstraint<d, subclass> {
	static implementBound<d extends Declaration<RangeKind>>(
		implementation: Pick<
			nodeImplementationInputOf<d>,
			"defaults" | "intersections"
		>
	): nodeImplementationOf<d> {
		return this.implement({
			collapseKey: "rule",
			hasAssociatedError: true,
			keys: {
				rule: {
					parse: normalizeLimit
				},
				exclusive: {
					// omit key with value false since it is the default
					parse: (flag: boolean) => flag || undefined
				}
			},
			normalize: (schema: d["schema"]) =>
				typeof schema === "object" && "rule" in schema
					? { ...schema, rule: schema.rule }
					: { rule: schema as Extract<d["schema"], LimitSchemaValue> },
			defaults: implementation.defaults as never,
			intersections: implementation.intersections
		}) as never
	}

	boundOperandKind = operandKindsByBoundKind[this.kind]
	compiledActual =
		this.boundOperandKind === "value"
			? `${jsData}`
			: this.boundOperandKind === "length"
			? `${jsData}.length`
			: `${jsData}.valueOf()`
	comparator = compileComparator(this.kind, this.exclusive)
	numericLimit = normalizeLimit(this.rule)
	compiledCondition = `${this.compiledActual} ${this.comparator} ${this.numericLimit}`
	compiledNegation = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.numericLimit}`

	readonly expectedContext = this.createExpectedContext({})

	readonly limitKind: LimitKind =
		this.comparator["0"] === "<" ? "upper" : "lower"

	isStricterThan(
		r: Node<d["kind"] | pairedRangeKind<d["kind"]>> | undefined
	): boolean
	isStricterThan(r: Node<RangeKind> | undefined) {
		if (r === undefined) {
			return true
		}
		const thisLimitIsStricter =
			this.limitKind === "upper" ? this.rule < r.rule : this.rule > r.rule
		return thisLimitIsStricter || (this.rule === r.rule && r.exclusive)
	}

	protected throwInvalidBoundOperandError(basis: Node<BasisKind> | undefined) {
		return throwInvalidOperandError(
			this.kind,
			prerequisiteDescriptionsByOperandKind[this.boundOperandKind],
			basis
		)
	}
}

export interface BoundInner<limit extends LimitSchemaValue = LimitSchemaValue>
	extends PrimitiveConstraintInner<limit> {
	readonly exclusive?: true
}

export type LimitSchemaValue = Date | number | string

export interface NormalizedBoundSchema<
	limit extends LimitSchemaValue = LimitSchemaValue
> extends PrimitiveConstraintInner<limit> {
	readonly exclusive?: boolean
}

export type BoundSchema<limit extends LimitSchemaValue = LimitSchemaValue> =
	| limit
	| NormalizedBoundSchema<limit>

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

export const normalizeLimit = (limit: LimitSchemaValue): number =>
	typeof limit === "string"
		? new Date(limit).valueOf()
		: limit instanceof Date
		? limit.valueOf()
		: limit

export type BaseRangeDeclaration = evaluate<
	BaseNodeDeclaration & {
		kind: RangeKind
		inner: BoundInner
	}
>

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
	exclusive: true | undefined
) =>
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${
		exclusive ? "" : "="
	}` as const

type BoundDeclarationInput = {
	kind: RangeKind
	rule: LimitSchemaValue
	prerequisite: unknown
}

export type declareRange<input extends BoundDeclarationInput> = declareNode<{
	kind: input["kind"]
	schema: BoundSchema<input["rule"]>
	normalizedSchema: NormalizedBoundSchema<input["rule"]>
	inner: BoundInner<input["rule"]>
	composition: "primitive"
	prerequisite: input["prerequisite"]
	expectedContext: BoundInner<input["rule"]>
}>

export type BoundOperandKind = "value" | "length" | "date"

export const prerequisiteDescriptionsByOperandKind = {
	value: "a number",
	length: "a string or Array",
	date: "a Date"
} as const satisfies Record<BoundOperandKind, string>

export type NumericRangeKind = "min" | "max"

export type NumericRangeDeclaration<
	kind extends NumericRangeKind = NumericRangeKind
> = declareRange<{
	kind: kind
	rule: number
	prerequisite: number
}>

export type LengthRangeKind = "minLength" | "maxLength"

export type LengthRangeDeclaration<
	kind extends LengthRangeKind = LengthRangeKind
> = declareRange<{
	kind: kind
	rule: number
	prerequisite: LengthBoundableData
}>

export type LengthBoundableData = string | List

export type DateRangeKind = "before" | "after"

export type DateRangeDeclaration<kind extends DateRangeKind = DateRangeKind> =
	declareRange<{
		kind: kind
		rule: Date | string | number
		prerequisite: Date
	}>

export const dateLimitToString = (limit: LimitSchemaValue) =>
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export interface DateBoundExtras {
	dateLimit: Date
	numericLimit: number
	stringLimit: string
}

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
