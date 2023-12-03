import {
	isKeyOf,
	type PartialRecord,
	type extend,
	type valueOf
} from "@arktype/util"
import type { NodeSubclass, declarationOf } from "../base.js"
import { In } from "../shared/compilation.js"
import type {
	BaseNodeDeclaration,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import type {
	BoundKind,
	PrimitiveConstraintAttachments
} from "../shared/define.js"
import type { Disjoint } from "../shared/disjoint.js"
import { RefinementNode } from "./shared.js"

export type BoundInner = {
	readonly limit: number
	readonly exclusive?: true
}

export type LimitSchemaValue = number | string

export type NormalizedBoundSchema<
	limit extends LimitSchemaValue = LimitSchemaValue
> = withAttributes<{
	readonly limit: limit
	readonly exclusive?: boolean
}>

export type BoundSchema<limit extends LimitSchemaValue = LimitSchemaValue> =
	| limit
	| NormalizedBoundSchema<limit>

export type BoundAttachments<limitKind extends LimitKind> = extend<
	PrimitiveConstraintAttachments,
	{
		comparator: RelativeComparator<limitKind>
	}
>

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

export type LowerBoundKind = keyof typeof boundKindPairsByLower

export type UpperBoundKind = valueOf<typeof boundKindPairsByLower>

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

const normalizeLimit = (limit: LimitSchemaValue): number =>
	typeof limit === "string" ? new Date(limit).valueOf() : limit

export type BoundSubclass = extend<
	NodeSubclass,
	{
		kind: BoundKind
		declaration: {
			inner: BoundInner
		}
	}
>

export abstract class BaseBound<
	subclass extends BoundSubclass
> extends RefinementNode<subclass> {
	o = this.inner
	size = compileSizeOf(this.kind)
	comparator = compileComparator(
		this.kind,
		this.exclusive
		// cast to lower bound comparator for internal checking
	)
	traverseApply = this.createPrimitiveTraversal()

	condition = `${this.size} ${this.comparator} ${this.limit}`
	negatedCondition = `${this.size} ${negatedComparators[this.comparator]} ${
		this.limit
	}`

	static createBoundParserImplementation<
		self,
		d extends BaseNodeDeclaration = declarationOf<self>
	>(this: self, kind: d["kind"]) {
		return {
			kind,
			collapseKey: "limit",
			keys: {
				limit: {
					parse: normalizeLimit
				},
				exclusive: {
					// omit key with value false since it is the default
					parse: (flag: boolean) => flag || undefined
				}
			},
			normalize: (schema: BoundSchema) =>
				(typeof schema === "object"
					? { ...schema, limit: schema.limit }
					: { limit: schema }) as d["normalizedSchema"]
		} as const
	}
}

// intersections: isKeyOf(boundDefinition.kind, boundKindPairsByLower)
// 	? // can't check intersections against a concrete case since the intersection
// 	  // pairings are dynamic keys, so just type the functions internally and cast
// 	  {
// 			// symmetric lower bound intersection
// 			[boundDefinition.kind]: (l: LowerNode, r: LowerNode): LowerNode =>
// 				l.limit > r.limit || (l.limit === r.limit && l.exclusive) ? l : r,
// 			// asymmetric bound intersections are handled by the lower bound
// 			[boundKindPairsByLower[boundDefinition.kind]]: (
// 				l: LowerNode,
// 				r: UpperNode
// 			): Disjoint | null =>
// 				l.limit > r.limit ||
// 				(l.limit === r.limit && (l.exclusive || r.exclusive))
// 					? Disjoint.from("bound", l, r)
// 					: null
// 	  }
// 	: ({
// 			// symmetric upper bound intersection
// 			[boundDefinition.kind]: (l: BoundNode, r: BoundNode): BoundNode =>
// 				l.limit < r.limit || (l.limit === r.limit && l.exclusive) ? l : r
// 	  } as any),
// compile: compilePrimitive

const compileComparator = (kind: BoundKind, exclusive: true | undefined) =>
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${
		exclusive ? "" : "="
	}` as const

const compileSizeOf = (kind: BoundKind) =>
	kind === "min" || kind === "max"
		? `${In}`
		: kind === "minLength" || kind === "maxLength"
		  ? `${In}.length`
		  : `+${In}`

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: BoundSchema<number>
	inner: BoundInner
	checks: number
	intersections: {
		min: "min"
		max: Disjoint | null
	}
}>

export class MinNode extends BaseBound<typeof MinNode> {
	static readonly kind = "min"
	static declaration: MinDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("min")
	)

	traverseAllows = this.exclusive
		? (data: number) => data > this.limit
		: (data: number) => data >= this.limit

	writeDefaultDescription() {
		return `${this.exclusive ? "more than" : "at least"} ${this.limit}`
	}

	getCheckedDefinitions() {
		return ["number"] as const
	}
}

export type MaxDeclaration = declareNode<{
	kind: "max"
	schema: BoundSchema<number>
	inner: BoundInner
	checks: number
	intersections: {
		// TODO: Fix rightOf
		max: "max"
	}
}>

export class MaxNode extends BaseBound<typeof MaxNode> {
	static readonly kind = "max"
	static declaration: MaxDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("max")
	)

	traverseAllows = this.exclusive
		? (data: number) => data < this.limit
		: (data: number) => data <= this.limit

	writeDefaultDescription() {
		return `${this.exclusive ? "less than" : "at most"} ${this.limit}`
	}

	getCheckedDefinitions() {
		return ["number"] as const
	}
}

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	schema: BoundSchema<number>
	inner: BoundInner
	checks: string | readonly unknown[]
	intersections: {
		minLength: "minLength"
		maxLength: Disjoint | null
	}
}>

export class MinLengthNode extends BaseBound<typeof MinLengthNode> {
	static readonly kind = "minLength"
	static declaration: MinLengthDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("minLength")
	)

	traverseAllows = this.exclusive
		? (data: string | readonly unknown[]) => data.length > this.limit
		: (data: string | readonly unknown[]) => data.length >= this.limit

	writeDefaultDescription() {
		return this.exclusive
			? this.limit === 0
				? "non-empty"
				: `more than length ${this.limit}`
			: this.limit === 1
			  ? "non-empty"
			  : `at least length ${this.limit}`
	}

	getCheckedDefinitions() {
		return ["string", Array] as const
	}
}

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	schema: BoundSchema<number>
	inner: BoundInner
	checks: string | readonly unknown[]
	intersections: {
		maxLength: "maxLength"
	}
}>

export class MaxLengthNode extends BaseBound<typeof MaxLengthNode> {
	static readonly kind = "maxLength"
	static declaration: MaxLengthDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("maxLength")
	)
	traverseAllows = this.exclusive
		? (data: string | readonly unknown[]) => data.length < this.limit
		: (data: string | readonly unknown[]) => data.length <= this.limit

	writeDefaultDescription() {
		return this.exclusive
			? `less than length ${this.limit}`
			: `at most length ${this.limit}`
	}

	getCheckedDefinitions() {
		return ["string", Array] as const
	}
}

export type AfterDeclaration = declareNode<{
	kind: "after"
	schema: BoundSchema<string | number>
	inner: BoundInner
	checks: Date
	intersections: {
		after: "after"
	}
}>

export class AfterNode extends BaseBound<typeof AfterNode> {
	static readonly kind = "after"
	static declaration: AfterDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("after")
	)

	traverseAllows = this.exclusive
		? (data: Date) => +data > this.limit
		: (data: Date) => +data >= this.limit

	writeDefaultDescription() {
		return this.exclusive ? `after ${this.limit}` : `${this.limit} or later`
	}

	getCheckedDefinitions() {
		return [Date] as const
	}
}

export type BeforeDeclaration = declareNode<{
	kind: "before"
	schema: BoundSchema<string | number>
	inner: BoundInner
	checks: Date
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export class BeforeNode extends BaseBound<typeof BeforeNode> {
	static readonly kind = "before"
	static declaration: BeforeDeclaration
	static parser = this.composeParser(
		this.createBoundParserImplementation("before")
	)

	traverseAllows = this.exclusive
		? (data: Date) => +data < this.limit
		: (data: Date) => +data <= this.limit

	writeDefaultDescription() {
		return this.exclusive ? `before ${this.limit}` : `${this.limit} or earlier`
	}

	getCheckedDefinitions() {
		return [Date] as const
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
