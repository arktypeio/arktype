import {
	constructorExtends,
	isKeyOf,
	throwParseError,
	type PartialRecord,
	type and,
	type valueOf
} from "@arktype/util"
import type { Node, NodeSubclass } from "../base.js"
import type { Declaration } from "../kinds.js"
import type {
	BaseMeta,
	BaseNodeDeclaration,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	throwInvalidOperandError,
	type BasisKind,
	type BoundKind,
	type nodeImplementationInputOf,
	type nodeImplementationOf
} from "../shared/implement.js"
import {
	BasePrimitiveRefinement,
	getBasisName,
	type FoldInput,
	type FoldOutput
} from "./refinement.js"

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
} as const satisfies PartialRecord<BoundKind, BoundKind>

type BoundKindPairsByLower = typeof boundKindPairsByLower

export type pairedBoundKind<kind extends BoundKind> =
	kind extends LowerBoundKind
		? BoundKindPairsByLower[kind]
		: {
				[lowerKind in LowerBoundKind]: kind extends BoundKindPairsByLower[lowerKind]
					? lowerKind
					: never
		  }[LowerBoundKind]

export type LowerBoundKind = keyof typeof boundKindPairsByLower

export type LowerNode = Node<LowerBoundKind>

export type UpperBoundKind = valueOf<typeof boundKindPairsByLower>

export type UpperNode = Node<UpperBoundKind>

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

const normalizeLimit = (limit: LimitSchemaValue): number =>
	typeof limit === "string" ? new Date(limit).valueOf() : limit

export type BaseBoundDeclaration = and<
	BaseNodeDeclaration,
	{
		kind: BoundKind
		inner: BoundInner
	}
>

export abstract class BaseBound<
	d extends BaseBoundDeclaration,
	subclass extends NodeSubclass<d>
> extends BasePrimitiveRefinement<d, subclass> {
	readonly hasOpenIntersection = false

	static implementBound<d extends Declaration<BoundKind>>(
		implementation: Pick<nodeImplementationInputOf<d>, "defaults">
	): nodeImplementationOf<d> {
		return this.implement({
			collapseKey: "limit",
			hasAssociatedError: true,
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
			? `${this.$.dataArg}`
			: this.boundOperandKind === "length"
			? `${this.$.dataArg}.length`
			: `${this.$.dataArg}.valueOf()`
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
		r: Node<d["kind"]> | Node<pairedBoundKind<d["kind"]>> | undefined
	) {
		if (r === undefined) {
			return true
		}
		const thisLimitIsStricter =
			this.limitKind === "upper" ? this.limit < r.limit : this.limit > r.limit
		return thisLimitIsStricter || (this.limit === r.limit && r.exclusive)
	}

	protected intersectOwnInner(r: Node<d["kind"]>) {
		return this.isStricterThan(r) ? this : r
	}

	protected throwInvalidBoundOperandError(basis: Node<BasisKind> | undefined) {
		return throwInvalidOperandError(
			this.kind,
			prerequisiteDescriptionsByOperandKind[this.boundOperandKind],
			basis
		)
	}
}

const operandKindsByBoundKind = {
	min: "value",
	max: "value",
	minLength: "length",
	maxLength: "length",
	after: "date",
	before: "date"
} as const satisfies Record<BoundKind, BoundOperandKind>

const compileComparator = (kind: BoundKind, exclusive: true | undefined) =>
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${
		exclusive ? "" : "="
	}` as const

abstract class BaseNumericBound<
	d extends BaseBoundDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseBound<d, subclass> {
	compiledActual = this.$.dataArg
	compiledCondition = `${this.compiledActual} ${this.comparator} ${this.limit}`
	compiledNegation = `${this.compiledActual} ${
		negatedComparators[this.comparator]
	} ${this.limit}`
}

type BoundDeclarationInput = {
	kind: BoundKind
	limit: LimitSchemaValue
	prerequisite: unknown
}

type declareBound<input extends BoundDeclarationInput> = declareNode<{
	kind: input["kind"]
	schema: BoundSchema<input["limit"]>
	normalizedSchema: NormalizedBoundSchema<input["limit"]>
	inner: BoundInner<input["limit"]>
	composition: "primitive"
	prerequisite: input["prerequisite"]
	expectedContext: BoundInner<input["limit"]>
}>

export type BoundOperandKind = "value" | "length" | "date"

const prerequisiteDescriptionsByOperandKind = {
	value: "a number",
	length: "a string or Array",
	date: "a Date"
} as const satisfies Record<BoundOperandKind, string>

export type NumericBoundKind = "min" | "max"

type NumericBoundDeclaration<kind extends NumericBoundKind = NumericBoundKind> =
	declareBound<{
		kind: kind
		limit: number
		prerequisite: number
	}>

export type MinDeclaration = NumericBoundDeclaration<"min">

export class MinNode extends BaseNumericBound<MinDeclaration, typeof MinNode> {
	static implementation: nodeImplementationOf<MinDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "more than" : "at least"} ${inner.limit}`
				}
			}
		})

	foldIntersection(into: FoldInput<"min">) {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.min = this.intersectOwnKind(into.min)
		return into
	}

	traverseAllows = this.exclusive
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit
}

export type MaxDeclaration = NumericBoundDeclaration<"max">

export class MaxNode extends BaseNumericBound<MaxDeclaration, typeof MaxNode> {
	static implementation: nodeImplementationOf<MaxDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return `${inner.exclusive ? "less than" : "at most"} ${inner.limit}`
				}
			}
		})

	traverseAllows = this.exclusive
		? (data: number) => data < this.limit
		: (data: number) => data <= this.limit

	foldIntersection(into: FoldInput<"max">): FoldOutput<"max"> {
		if (into.basis?.domain !== "number") {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.max = this.intersectOwnKind(into.max)
		if (into.min?.isStricterThan(this)) {
			return Disjoint.from("bound", this, into.min)
		}
		return into
	}
}

export type LengthBoundKind = "minLength" | "maxLength"

type LengthBoundDeclaration<kind extends LengthBoundKind = LengthBoundKind> =
	declareBound<{
		kind: kind
		limit: number
		prerequisite: string | readonly unknown[]
	}>

export type MinLengthDeclaration = LengthBoundDeclaration<"minLength">

export class MinLengthNode extends BaseBound<
	MinLengthDeclaration,
	typeof MinLengthNode
> {
	static implementation: nodeImplementationOf<MinLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? inner.limit === 0
							? "non-empty"
							: `more than length ${inner.limit}`
						: inner.limit === 1
						? "non-empty"
						: `at least length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: string | readonly unknown[]) => data.length > this.limit
		: (data: string | readonly unknown[]) => data.length >= this.limit

	foldIntersection(into: FoldInput<"minLength">) {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.minLength = this.intersectOwnKind(into.minLength)
		return into
	}
}

export type MaxLengthDeclaration = LengthBoundDeclaration<"maxLength">

export class MaxLengthNode extends BaseBound<
	MaxLengthDeclaration,
	typeof MaxLengthNode
> {
	static implementation: nodeImplementationOf<MaxLengthDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					return inner.exclusive
						? `less than length ${inner.limit}`
						: `at most length ${inner.limit}`
				},
				actual: (data) => `${data.length}`
			}
		})

	traverseAllows = this.exclusive
		? (data: string | readonly unknown[]) => data.length < this.limit
		: (data: string | readonly unknown[]) => data.length <= this.limit

	foldIntersection(into: FoldInput<"maxLength">): FoldOutput<"maxLength"> {
		if (
			into.basis?.domain !== "string" &&
			!into.basis?.extends(this.$.builtin.Array)
		) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.maxLength = this.intersectOwnKind(into.maxLength)
		if (into.minLength?.isStricterThan(this)) {
			return Disjoint.from("bound", this, into.minLength)
		}
		return into
	}
}

export type DateBoundKind = "before" | "after"

type DateBoundDeclaration<kind extends DateBoundKind = DateBoundKind> =
	declareBound<{
		kind: kind
		limit: string | number
		prerequisite: Date
	}>

const dateLimitToString = (limit: LimitSchemaValue) =>
	typeof limit === "string" ? limit : new Date(limit).toLocaleString()

export type AfterDeclaration = DateBoundDeclaration<"after">

interface DateBoundExtras {
	dateLimit: Date
	numericLimit: number
	stringLimit: string
}

export class AfterNode
	extends BaseBound<AfterDeclaration, typeof AfterNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<AfterDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					const limitString = dateLimitToString(inner.limit)
					return inner.exclusive
						? `after ${limitString}`
						: `${limitString} or later`
				},
				actual: (data) => data.toLocaleString()
			}
		})

	dateLimit = new Date(this.limit)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.limit)

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.numericLimit
		: (data: Date) => +data >= this.numericLimit

	foldIntersection(into: FoldInput<"after">) {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.after = this.intersectOwnKind(into.after)
		return into
	}
}

export type BeforeDeclaration = DateBoundDeclaration<"before">

export class BeforeNode
	extends BaseBound<BeforeDeclaration, typeof BeforeNode>
	implements DateBoundExtras
{
	static implementation: nodeImplementationOf<BeforeDeclaration> =
		this.implementBound({
			defaults: {
				description(inner) {
					const limitString = dateLimitToString(inner.limit)
					return inner.exclusive
						? `before ${limitString}`
						: `${limitString} or earlier`
				},
				actual: (data) => data.toLocaleString()
			}
		})

	dateLimit = new Date(this.limit)
	numericLimit = +this.dateLimit
	stringLimit = dateLimitToString(this.limit)

	traverseAllows = this.exclusive
		? (data: Date) => +data < this.numericLimit
		: (data: Date) => +data <= this.numericLimit

	foldIntersection(into: FoldInput<"before">): FoldOutput<"before"> {
		if (!into.basis?.extends(this.$.builtin.Date)) {
			this.throwInvalidBoundOperandError(into.basis)
		}
		into.before = this.intersectOwnKind(into.before)
		if (into.after?.isStricterThan(this)) {
			return Disjoint.from("bound", this, into.after)
		}
		return into
	}
}

export type BoundDeclarations = {
	min: MinDeclaration
	max: MaxDeclaration
	minLength: MinLengthDeclaration
	maxLength: MaxLengthDeclaration
	after: AfterDeclaration
	before: BeforeDeclaration
}

export const BoundNodes = {
	min: MinNode,
	max: MaxNode,
	minLength: MinLengthNode,
	maxLength: MaxLengthNode,
	after: AfterNode,
	before: BeforeNode
}
