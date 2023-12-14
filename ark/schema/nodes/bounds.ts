import {
	isKeyOf,
	type PartialRecord,
	type extend,
	type valueOf
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Declaration, hasOpenIntersection } from "../kinds.js"
import type { CompilationContext } from "../scope.js"
import type {
	BaseNodeDeclaration,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import type { BoundKind, NodeParserImplementation } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { BasePrimitiveRefinement } from "./refinement.js"

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

export type LowerNode = Node<LowerBoundKind>

export type UpperBoundKind = valueOf<typeof boundKindPairsByLower>

export type UpperNode = Node<UpperBoundKind>

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

const normalizeLimit = (limit: LimitSchemaValue): number =>
	typeof limit === "string" ? new Date(limit).valueOf() : limit

const createLowerIntersections = <kind extends LowerBoundKind>(kind: kind) =>
	({
		// symmetric lower bound intersection
		[kind]: (l: LowerNode, r: LowerNode): LowerNode =>
			l.limit > r.limit || (l.limit === r.limit && l.exclusive) ? l : r,
		// asymmetric bound intersections are handled by the lower bound
		[boundKindPairsByLower[kind]]: (
			l: LowerNode,
			r: UpperNode
		): Disjoint | null =>
			l.limit > r.limit || (l.limit === r.limit && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	}) as {} as NodeIntersections<Declaration<kind>>

const createUpperIntersections = <kind extends UpperBoundKind>(kind: kind) =>
	({
		// symmetric upper bound intersection
		[kind]: (l: UpperNode, r: UpperNode): Node<UpperBoundKind> =>
			l.limit < r.limit || (l.limit === r.limit && l.exclusive) ? l : r
	}) as {} as NodeIntersections<Declaration<kind>>

export type BaseBoundDeclaration = extend<
	BaseNodeDeclaration,
	{
		kind: BoundKind
		inner: BoundInner
	}
>

export abstract class BaseBound<
	d extends BaseBoundDeclaration
> extends BasePrimitiveRefinement<d> {
	static parser = {
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
				? // pretend limit is a number to allow subclasses like min
				  { ...schema, limit: schema.limit as number }
				: { limit: schema }) as NormalizedBoundSchema<number>
	} as const satisfies NodeParserImplementation<Declaration<BoundKind>>

	readonly hasOpenIntersection = false as hasOpenIntersection<d>

	size = compileSizeOf(this.kind, this.scope.argName)
	comparator = compileComparator(
		this.kind,
		this.exclusive
		// cast to lower bound comparator for internal checking
	)

	condition = `${this.size} ${this.comparator} ${this.limit}`
	negatedCondition = `${this.size} ${negatedComparators[this.comparator]} ${
		this.limit
	}`

	compileBody(ctx: CompilationContext) {
		return this.scope.compilePrimitive(this as never, ctx)
	}
}

const compileComparator = (kind: BoundKind, exclusive: true | undefined) =>
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${
		exclusive ? "" : "="
	}` as const

const compileSizeOf = (kind: BoundKind, argName: string) =>
	kind === "min" || kind === "max"
		? `${argName}`
		: kind === "minLength" || kind === "maxLength"
		  ? `${argName}.length`
		  : `+${argName}`

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: BoundSchema<number>
	normalizedSchema: NormalizedBoundSchema<number>
	inner: BoundInner
	prerequisite: number
	intersections: {
		min: "min"
		max: Disjoint | null
	}
}>

export class MinNode extends BaseBound<MinDeclaration> {
	static intersections = createLowerIntersections("min")

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
	normalizedSchema: NormalizedBoundSchema<number>
	inner: BoundInner
	prerequisite: number
	intersections: {
		// TODO: Fix rightOf
		max: "max"
	}
}>

export class MaxNode extends BaseBound<MaxDeclaration> {
	static intersections = createUpperIntersections("max")

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
	normalizedSchema: NormalizedBoundSchema<number>
	inner: BoundInner
	prerequisite: string | readonly unknown[]
	intersections: {
		minLength: "minLength"
		maxLength: Disjoint | null
	}
}>

export class MinLengthNode extends BaseBound<MinLengthDeclaration> {
	static intersections = createLowerIntersections("minLength")

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
	normalizedSchema: NormalizedBoundSchema<number>
	inner: BoundInner
	prerequisite: string | readonly unknown[]
	intersections: {
		maxLength: "maxLength"
	}
}>

export class MaxLengthNode extends BaseBound<MaxLengthDeclaration> {
	static intersections = createUpperIntersections("maxLength")

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
	normalizedSchema: NormalizedBoundSchema<string | number>
	inner: BoundInner
	prerequisite: Date
	intersections: {
		after: "after"
	}
}>

export class AfterNode extends BaseBound<AfterDeclaration> {
	static intersections = createLowerIntersections("after")

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
	normalizedSchema: NormalizedBoundSchema<string | number>
	inner: BoundInner
	prerequisite: Date
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export class BeforeNode extends BaseBound<BeforeDeclaration> {
	static intersections = createUpperIntersections("before")

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
