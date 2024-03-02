import {
	invert,
	isKeyOf,
	type List,
	type PartialRecord,
	type evaluate,
	type valueOf
} from "@arktype/util"
import type { Node, NodeSubclass } from "../../base.js"
import type { Declaration } from "../../kinds.js"
import { jsData } from "../../shared/compile.js"
import type {
	BaseMeta,
	BaseNodeDeclaration,
	declareNode
} from "../../shared/declare.js"
import {
	throwInvalidOperandError,
	type BasisKind,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "../../shared/implement.js"
import { BasePrimitiveConstraint } from "../constraint.js"
import type { RangeKind } from "./shared.js"

export abstract class BaseRange<
	d extends BaseRangeDeclaration,
	subclass extends NodeSubclass<d>
> extends BasePrimitiveConstraint<d, subclass> {
	static implementBound<d extends Declaration<RangeKind>>(
		implementation: Pick<nodeImplementationInputOf<d>, "defaults">
	): nodeImplementationOf<d> {
		return this.implement({
			collapseKey: "limit",
			hasAssociatedError: true,
			intersectSymmetric: (l, r) => (l.isStricterThan(r as never) ? l : r),
			keys: {
				limit: {
					parse: normalizeLimit
				},
				exclusive: {
					// omit key with value false since it is the default
					parse: (flag: boolean) => flag || undefined
				}
			},
			normalize: (schema: d["schema"]) =>
				typeof schema === "object"
					? { ...schema, limit: schema.limit }
					: { limit: schema as Extract<d["schema"], LimitSchemaValue> },
			defaults: implementation.defaults as never
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
	numericLimit = normalizeLimit(this.limit)
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
			this.limitKind === "upper" ? this.limit < r.limit : this.limit > r.limit
		return thisLimitIsStricter || (this.limit === r.limit && r.exclusive)
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
	extends BaseMeta {
	readonly limit: limit
	readonly exclusive?: true
}

export type LimitSchemaValue = number | string

export interface NormalizedBoundSchema<
	limit extends LimitSchemaValue = LimitSchemaValue
> extends BaseMeta {
	readonly limit: limit
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
	typeof limit === "string" ? new Date(limit).valueOf() : limit

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
	limit: LimitSchemaValue
	prerequisite: unknown
}

export type declareRange<input extends BoundDeclarationInput> = declareNode<{
	kind: input["kind"]
	schema: BoundSchema<input["limit"]>
	normalizedSchema: NormalizedBoundSchema<input["limit"]>
	inner: BoundInner<input["limit"]>
	composition: "primitive"
	prerequisite: input["prerequisite"]
	expectedContext: BoundInner<input["limit"]>
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
	limit: number
	prerequisite: number
}>

export type LengthRangeKind = "minLength" | "maxLength"

export type LengthRangeDeclaration<
	kind extends LengthRangeKind = LengthRangeKind
> = declareRange<{
	kind: kind
	limit: number
	prerequisite: LengthBoundableData
}>

export type LengthBoundableData = string | List

export type DateRangeKind = "before" | "after"

export type DateRangeDeclaration<kind extends DateRangeKind = DateRangeKind> =
	declareRange<{
		kind: kind
		limit: string | number
		prerequisite: Date
	}>

export const dateLimitToString = (limit: LimitSchemaValue) =>
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export interface DateBoundExtras {
	dateLimit: Date
	numericLimit: number
	stringLimit: string
}