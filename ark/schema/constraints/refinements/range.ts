import {
	type PartialRecord,
	type array,
	invert,
	isKeyOf,
	type propValueOf
} from "@arktype/util"
import type { BaseAttachments, Node } from "../../base.js"
import type {
	BaseMeta,
	RawNodeDeclaration,
	parsedAttachmentsOf
} from "../../shared/declare.js"
import {
	type DerivedPrimitiveAttachments,
	type KeyDefinitions,
	type PrimitiveAttachments,
	type RangeKind,
	derivePrimitiveAttachments
} from "../../shared/implement.js"
import type { Comparator } from "../ast.js"
import type { ConstraintAttachments } from "../constraint.js"

export interface BaseRangeDeclaration extends RawNodeDeclaration {
	kind: RangeKind
	inner: BaseRangeInner
	normalizedDef: BaseNormalizedRangeSchema
	attachments: RangeAttachments<any>
}

export interface DerivedRangeAttachments<
	d extends BaseRangeDeclaration = BaseRangeDeclaration
> {
	expression: string
	boundOperandKind: BoundOperandKind
	compiledActual: string
	compiledCondition: string
	compiledNegation: string
	comparator: Comparator
	numericLimit: number
	stringLimit: string
	limitKind: LimitKind
	isStricterThan(r: Node<d["kind"] | pairedRangeKind<d["kind"]>>): boolean
	overlapsRange(r: Node<pairedRangeKind<d["kind"]>>): boolean
	overlapIsUnit(r: Node<pairedRangeKind<d["kind"]>>): boolean
}

export interface RangeAttachments<
	d extends BaseRangeDeclaration = BaseRangeDeclaration
> extends BaseAttachments<d>,
		PrimitiveAttachments<d>,
		ConstraintAttachments,
		DerivedRangeAttachments<d> {}

export type ImplementedRangeAttachments<d extends BaseRangeDeclaration> = Omit<
	d["attachments"],
	keyof DerivedRangeAttachments | keyof DerivedPrimitiveAttachments
>

export const deriveRangeAttachments = <d extends BaseRangeDeclaration = never>(
	parsed: parsedAttachmentsOf<d>,
	implemented: ImplementedRangeAttachments<d>
): d["attachments"] & ThisType<Node<RangeKind>> => {
	const self: parsedAttachmentsOf<d> = derivePrimitiveAttachments(
		parsed,
		implemented as never
	) as never
	const boundOperandKind = operandKindsByBoundKind[self.kind]
	const compiledActual =
		boundOperandKind === "value" ? "data"
		: boundOperandKind === "length" ? "data.length"
		: "data.valueOf()"
	const comparator = compileComparator(self.kind, self.exclusive)
	const numericLimit = self.rule.valueOf()

	return Object.assign(self, {
		boundOperandKind,
		compiledActual,
		comparator,
		numericLimit,
		expression: `${comparator}${self.rule}`,
		compiledCondition: `${compiledActual} ${comparator} ${numericLimit}`,
		compiledNegation: `${compiledActual} ${negatedComparators[comparator]} ${numericLimit}`,
		// we need to compute stringLimit before errorContext, which references it
		// transitively through description for date bounds
		stringLimit:
			boundOperandKind === "date" ?
				dateLimitToString(numericLimit)
			:	`${numericLimit}`,
		limitKind: comparator["0"] === "<" ? "upper" : "lower",
		isStricterThan(r) {
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
		},
		overlapsRange(r) {
			if (this.isStricterThan(r as never)) return false
			if (
				this.numericLimit === r.numericLimit &&
				(this.exclusive || r.exclusive)
			)
				return false
			return true
		},
		overlapIsUnit(r) {
			return (
				this.numericLimit === r.numericLimit && !this.exclusive && !r.exclusive
			)
		}
	} satisfies DerivedRangeAttachments & ThisType<Node<RangeKind>>) as never
}

export interface BaseRangeInner extends BaseMeta {
	readonly rule: number | Date
	readonly exclusive?: true
}

export type LimitSchemaValue<kind extends RangeKind = RangeKind> =
	kind extends "before" | "after" ? Date | number | string : number

export type LimitInnerValue<kind extends RangeKind = RangeKind> =
	kind extends "before" | "after" ? Date : number

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
	kind extends LowerBoundKind ? BoundKindPairsByLower[kind]
	:	BoundKindPairsByUpper[kind & UpperBoundKind]

export type LowerBoundKind = keyof typeof boundKindPairsByLower

export type LowerNode = Node<LowerBoundKind>

export type UpperBoundKind = propValueOf<typeof boundKindPairsByLower>

export type UpperNode = Node<UpperBoundKind>

export type NumericallyBoundable = string | number | array

export type Boundable = NumericallyBoundable | Date

export const parseExclusiveKey: KeyDefinitions<BaseRangeDeclaration>["exclusive"] =
	{
		// omit key with value false since it is the default
		parse: (flag: boolean) => flag || undefined
	}

export const parseDateLimit = (limit: LimitSchemaValue): Date =>
	typeof limit === "string" || typeof limit === "number" ?
		new Date(limit)
	:	limit

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
