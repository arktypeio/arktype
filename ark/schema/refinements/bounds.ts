import {
	isKeyOf,
	type PartialRecord,
	type extend,
	type valueOf
} from "@arktype/util"
import type { Node } from "../base.js"
import type { Builtins } from "../shared/builtins.js"
import { In, compilePrimitive } from "../shared/compilation.js"
import type { withAttributes } from "../shared/declare.js"
import type {
	BoundKind,
	PrimitiveConstraintAttachments
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Declaration } from "../shared/nodes.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type RefinementImplementationInput,
	type declareRefinement
} from "./shared.js"

export type BoundInner<limit extends LimitValue = LimitValue> = withAttributes<{
	readonly limit: limit
	readonly exclusive?: boolean
}>

export type LimitValue = number | string

export type BoundDefinition<limit extends LimitValue = LimitValue> =
	| limit
	| BoundInner<limit>

export type BoundAttachments<limitKind extends LimitKind> = extend<
	PrimitiveConstraintAttachments,
	{
		comparator: RelativeComparator<limitKind>
	}
>

type BoundNode = Node<BoundKind>

type LowerNode = Node<LowerBoundKind>

type UpperNode = Node<UpperBoundKind>

// const unitsByBoundKind = {
// 	date: "",
// 	number: "",
// 	string: "characters",
// 	array: "elements"
// } as const

// export type BoundKind = keyof typeof unitsByBoundKind

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

export const defineBound = <kind extends BoundKind>(boundDefinition: {
	kind: kind
	writeDefaultDescription: (node: BoundNode) => string
	operands: (keyof Builtins)[]
}) =>
	defineRefinement({
		// check this generic bound implementation against a concrete case
		// ("min"), then cast it to the expected parameterized definition
		kind: boundDefinition.kind as "min",
		collapseKey: "limit",
		keys: {
			limit: {},
			exclusive: {}
		},
		operands: boundDefinition.operands,
		normalize: (schema) =>
			typeof schema === "object" ? schema : { limit: schema },
		writeDefaultDescription: boundDefinition.writeDefaultDescription,
		attach: (node) => {
			const comparator = `${
				isKeyOf(boundDefinition.kind, boundKindPairsByLower) ? ">" : "<"
			}${
				node.exclusive ? "" : "="
				// cast to lower bound comparator for internal checking
			}` as RelativeComparator<"lower">
			return {
				comparator,
				assertValidBasis: createValidBasisAssertion(node),
				condition: `${In} ${comparator} ${node.limit}`,
				negatedCondition: `${In} ${negatedComparators[comparator]} ${node.limit}`
			}
		},
		intersections: isKeyOf(boundDefinition.kind, boundKindPairsByLower)
			? // can't check intersections against a concrete case since the intersection
			  // pairings are dynamic keys, so just type the functions internally and cast
			  {
					// symmetric lower bound intersection
					[boundDefinition.kind]: (l: LowerNode, r: LowerNode): LowerNode =>
						l.limit > r.limit || (l.limit === r.limit && l.exclusive) ? l : r,
					// asymmetric bound intersections are handled by the lower bound
					[boundKindPairsByLower[boundDefinition.kind]]: (
						l: LowerNode,
						r: UpperNode
					): Disjoint | null =>
						l.limit > r.limit ||
						(l.limit === r.limit && (l.exclusive || r.exclusive))
							? Disjoint.from("bound", l, r)
							: null
			  }
			: ({
					// symmetric upper bound intersection
					[boundDefinition.kind]: (l: BoundNode, r: BoundNode): BoundNode =>
						l.limit < r.limit || (l.limit === r.limit && l.exclusive) ? l : r
			  } as any),
		compile: compilePrimitive
	} satisfies RefinementImplementationInput<Declaration<"min">> as never)

export type MinDeclaration = declareRefinement<{
	kind: "min"
	schema: BoundDefinition<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	operands: number
	intersections: {
		min: "min"
		max: Disjoint | null
	}
}>

export const MinImplementation = defineBound({
	kind: "min",
	operands: ["number"],
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "more than" : "at least"} ${node.limit}`
})

export type MaxDeclaration = declareRefinement<{
	kind: "max"
	schema: BoundDefinition<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	operands: number
	intersections: {
		// TODO: Fix rightOf
		max: "max"
	}
}>

export const MaxImplementation = defineBound({
	kind: "max",
	operands: ["number"],
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "less than" : "at most"} ${node.limit}`
})

export type MinLengthDeclaration = declareRefinement<{
	kind: "minLength"
	schema: BoundDefinition<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	operands: string | readonly unknown[]
	intersections: {
		minLength: "minLength"
		maxLength: Disjoint | null
	}
}>

export const MinLengthImplementation = defineBound({
	kind: "minLength",
	operands: ["string", "array"],
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
	schema: BoundDefinition<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	operands: string | readonly unknown[]
	intersections: {
		maxLength: "maxLength"
	}
}>

export const MaxLengthImplementation = defineBound({
	kind: "maxLength",
	operands: ["string", "array"],
	writeDefaultDescription: (node) =>
		node.exclusive
			? `less than ${node.limit} in length`
			: `at most ${node.limit} in length`
})

export type AfterDeclaration = declareRefinement<{
	kind: "after"
	schema: BoundDefinition<string | number>
	inner: BoundInner<string | number>
	attach: BoundAttachments<"lower">
	operands: Date
	intersections: {
		after: "after"
	}
}>

export const AfterImplementation = defineBound({
	kind: "before",
	operands: ["date"],
	writeDefaultDescription: (node) =>
		node.exclusive ? `after ${node.limit}` : `${node.limit} or later`
})

export type BeforeDeclaration = declareRefinement<{
	kind: "before"
	schema: BoundDefinition<string | number>
	inner: BoundInner<string | number>
	attach: BoundAttachments<"upper">
	operands: Date
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export const BeforeImplementation = defineBound({
	kind: "before",
	operands: ["date"],
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
