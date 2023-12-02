import {
	isKeyOf,
	type PartialRecord,
	type extend,
	type valueOf
} from "@arktype/util"
import type { Node } from "../base.js"
import { In, composePrimitiveTraversal } from "../shared/compilation.js"
import type {
	BaseAttributes,
	BaseNodeDeclaration,
	InputData,
	withAttributes
} from "../shared/declare.js"
import type {
	BoundKind,
	PrimitiveConstraintAttachments,
	TypeKind
} from "../shared/define.js"
import type { Disjoint } from "../shared/disjoint.js"
import type { Declaration, Schema } from "../shared/nodes.js"
import {
	composeOperandAssertion,
	composeRefinement,
	type RefinementImplementationInput,
	type declareRefinement
} from "./shared.js"

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

type BoundNode = Node<BoundKind>

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

export type Boundable = Declaration<BoundKind>["operand"]

export type BoundNodeDefinition<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	defineChecker: (inner: d["inner"]) => (data: never) => boolean
	writeDefaultDescription: (node: BoundNode) => string
	operand: readonly Schema<TypeKind>[]
}

export const normalizeLimit = (limit: LimitSchemaValue): number =>
	typeof limit === "string" ? new Date(limit).valueOf() : limit

export const defineBound = <d extends BaseNodeDeclaration>(
	boundDefinition: BoundNodeDefinition<d>
) =>
	composeRefinement({
		// check this generic bound implementation against a concrete case
		// ("min"), then cast it to the expected parameterized definition
		kind: boundDefinition.kind as "min",
		collapseKey: "limit",
		keys: {
			limit: {},
			exclusive: {
				// omit key with value false since it is the default
				parse: (flag) => flag || undefined
			}
		},
		operand: boundDefinition.operand,
		normalize: (schema: BoundSchema) =>
			typeof schema === "object"
				? { ...schema, limit: normalizeLimit(schema.limit) }
				: { limit: normalizeLimit(schema) },
		attach: (node) => {
			const size = compileSizeOf(node.kind)
			const comparator = compileComparator(
				node.kind,
				node.exclusive
				// cast to lower bound comparator for internal checking
			) as RelativeComparator<"lower">
			const checker = boundDefinition.defineChecker(node as never) as (
				data: InputData<"min">
			) => boolean
			return {
				comparator,
				traverseAllows: checker,
				traverseApply: composePrimitiveTraversal(node as never, checker),
				assertValidBasis: composeOperandAssertion(node),
				condition: `${size} ${comparator} ${node.limit}`,
				negatedCondition: `${size} ${negatedComparators[comparator]} ${node.limit}`
			}
		}
	} satisfies RefinementImplementationInput<Declaration<"min">> as never)

// writeDefaultDescription: boundDefinition.writeDefaultDescription,
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
	`${isKeyOf(kind, boundKindPairsByLower) ? ">" : "<"}${exclusive ? "" : "="}`

const compileSizeOf = (kind: BoundKind) =>
	kind === "min" || kind === "max"
		? `${In}`
		: kind === "minLength" || kind === "maxLength"
		  ? `${In}.length`
		  : `+${In}`

export type MinDeclaration = declareRefinement<{
	kind: "min"
	schema: BoundSchema<number>
	inner: BoundInner
	attach: BoundAttachments<"lower">
	operand: number
	intersections: {
		min: "min"
		max: Disjoint | null
	}
}>

export const MinImplementation = defineBound({
	kind: "min",
	operand: ["number"],
	defineChecker: (node) =>
		node.exclusive ? (data) => data > node.limit : (data) => data >= node.limit,
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "more than" : "at least"} ${node.limit}`
})

export type MaxDeclaration = declareRefinement<{
	kind: "max"
	schema: BoundSchema<number>
	inner: BoundInner
	operand: number
	intersections: {
		// TODO: Fix rightOf
		max: "max"
	}
}>

export const MaxImplementation = defineBound({
	kind: "max",
	operand: ["number"],
	defineChecker: (node) =>
		node.exclusive ? (data) => data < node.limit : (data) => data <= node.limit,
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "less than" : "at most"} ${node.limit}`
})

export type MinLengthDeclaration = declareRefinement<{
	kind: "minLength"
	schema: BoundSchema<number>

	inner: BoundInner
	operand: string | readonly unknown[]
	intersections: {
		minLength: "minLength"
		maxLength: Disjoint | null
	}
}>

export const MinLengthImplementation = defineBound({
	kind: "minLength",
	operand: ["string", Array],
	defineChecker: (node) =>
		node.exclusive
			? (data) => data.length > node.limit
			: (data) => data.length >= node.limit,
	writeDefaultDescription: (node) =>
		node.exclusive
			? node.limit === 0
				? "non-empty"
				: `more than ${node.limit} in length`
			: node.limit === 1
			  ? "non-empty"
			  : `at least ${node.limit} in length`
})

export type MaxLengthDeclaration = declareRefinement<{
	kind: "maxLength"
	schema: BoundSchema<number>

	inner: BoundInner
	operand: string | readonly unknown[]
	intersections: {
		maxLength: "maxLength"
	}
}>

export const MaxLengthImplementation = defineBound({
	kind: "maxLength",
	operand: ["string", Array],
	defineChecker: (node) =>
		node.exclusive
			? (data) => data.length < node.limit
			: (data) => data.length <= node.limit,
	writeDefaultDescription: (node) =>
		node.exclusive
			? `less than ${node.limit} in length`
			: `at most ${node.limit} in length`
})

export type AfterDeclaration = declareRefinement<{
	kind: "after"
	schema: BoundSchema<string | number>
	inner: BoundInner
	operand: Date
	intersections: {
		after: "after"
	}
}>

export const AfterImplementation = defineBound({
	kind: "before",
	operand: [Date],
	defineChecker: (node) =>
		node.exclusive
			? (data) => +data > node.limit
			: (data) => +data >= node.limit,
	writeDefaultDescription: (node) =>
		node.exclusive ? `after ${node.limit}` : `${node.limit} or later`
})

export type BeforeDeclaration = declareRefinement<{
	kind: "before"
	schema: BoundSchema<string | number>

	inner: BoundInner
	operand: Date
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export const BeforeImplementation = defineBound({
	kind: "before",
	operand: [Date],
	defineChecker: (node) =>
		node.exclusive
			? (data) => +data < node.limit
			: (data) => +data <= node.limit,
	writeDefaultDescription: (node) =>
		node.exclusive ? `before ${node.limit}` : `${node.limit} or earlier`
})

export type BoundDeclarations = {
	min: MinDeclaration
	max: MaxDeclaration
	minLength: MinLengthDeclaration
	maxLength: MaxLengthDeclaration
	after: AfterDeclaration
	before: BeforeDeclaration
}

export const BoundImplementations = {
	min: MinImplementation,
	max: MaxImplementation,
	minLength: MinLengthImplementation,
	maxLength: MaxLengthImplementation,
	after: AfterImplementation,
	before: BeforeImplementation
}
