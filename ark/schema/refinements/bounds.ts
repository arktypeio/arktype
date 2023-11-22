import { constructorExtends, throwParseError, type extend } from "@arktype/util"
import { In } from "../io/compile.js"
import type { Builtins } from "../node.js"
import type { withAttributes } from "../shared/declare.js"
import type {
	BasisKind,
	BoundKind,
	ConstraintAttachments
} from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Declaration, Node } from "../shared/node.js"
import {
	createValidBasisAssertion,
	defineRefinement,
	type RefinementImplementationInput,
	type declareRefinement
} from "./shared.js"

export type BoundInner<limit extends LimitLiteral = LimitLiteral> =
	withAttributes<{
		readonly limit: limit
		readonly exclusive?: boolean
	}>

export type LimitLiteral = number | string

export type BoundSchema<limit extends LimitLiteral = LimitLiteral> =
	| limit
	| BoundInner<limit>

export type BoundLimit = number | string

export type BoundAttachments<limitKind extends LimitKind> = extend<
	ConstraintAttachments,
	{
		comparator: RelativeComparator<limitKind>
	}
>

export type BoundNode = Node<BoundKind>

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

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

export const getBoundKind = (basis: Node<BasisKind> | undefined) => {
	if (basis === undefined) {
		return throwParseError(writeUnboundableMessage("unknown"))
	}
	if (basis.domain === "number") {
		return "numeric"
	}
	if (
		basis.domain === "string" ||
		(basis.kind === "unit" && basis.is instanceof Array) ||
		(basis.kind === "proto" && constructorExtends(basis.proto, Array))
	) {
		return "length"
	}
	if (
		(basis.kind === "unit" && basis.is instanceof Date) ||
		(basis.kind === "proto" && constructorExtends(basis.proto, Date))
	) {
		return "date"
	}
	return throwParseError(writeUnboundableMessage(basis.basisName))
}

export const defineBound = <kind extends BoundKind>(boundDefinition: {
	kind: kind
	limitKind: LimitKind
	writeDefaultDescription: (node: BoundNode) => string
	operands: (keyof Builtins)[]
}) =>
	defineRefinement({
		// check this generic bound implementation against a concrete case
		// ("min"), then cast it to the expected parameterized definition
		kind: boundDefinition.kind as "min",
		keys: {
			limit: {},
			exclusive: {}
		},
		operands: boundDefinition.operands,
		normalize: (schema) =>
			typeof schema === "object" ? schema : { limit: schema },
		writeDefaultDescription: boundDefinition.writeDefaultDescription,
		attach: (node) => {
			const comparator = `${boundDefinition.limitKind === "lower" ? ">" : "<"}${
				node.exclusive ? "" : "="
				// cast to lower bound comparator for internal checking
			}` as RelativeComparator<"lower">
			return {
				comparator,
				assertValidBasis: createValidBasisAssertion(node),
				condition: `${In} ${comparator} ${node.limit}`
			}
		},
		intersections:
			boundDefinition.limitKind === "lower"
				? {
						// symmetric lower bound intersection
						[boundDefinition.kind]: (l: BoundNode, r: BoundNode): BoundNode =>
							l.limit > r.limit || (l.limit === r.limit && l.exclusive) ? l : r,
						min: (l: BoundNode, r: BoundNode): Disjoint | null =>
							l.limit < r.limit ||
							(l.limit === r.limit && (l.exclusive || r.exclusive))
								? Disjoint.from("bound", l, r)
								: null
						// asymmetric bound intersections are handled by the lower bound
				  }
				: // can't check intersections against a concrete case since the intersection
				  // pairings are dynamic keys, so just type the functions internally and cast
				  ({
						// symmetric upper bound intersection
						[boundDefinition.kind]: (l: BoundNode, r: BoundNode): BoundNode =>
							l.limit < r.limit || (l.limit === r.limit && l.exclusive) ? l : r
				  } as any)
	} satisfies RefinementImplementationInput<Declaration<"min">> as never)

export type MinDeclaration = declareRefinement<{
	kind: "min"
	schema: BoundSchema<number>
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
	limitKind: "lower",
	operands: ["number"],
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "more than" : "at least"} ${node.limit}`
})

export type MaxDeclaration = declareRefinement<{
	kind: "max"
	schema: BoundSchema<number>
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
	limitKind: "upper",
	operands: ["number"],
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "less than" : "at most"} ${node.limit}`
})

export type MinLengthDeclaration = declareRefinement<{
	kind: "minLength"
	schema: BoundSchema<number>
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
	limitKind: "lower",
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
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	operands: string | readonly unknown[]
	intersections: {
		maxLength: "maxLength"
	}
}>

export const MaxLengthImplementation = defineBound({
	kind: "maxLength",
	limitKind: "upper",
	operands: ["string", "array"],
	writeDefaultDescription: (node) =>
		node.exclusive
			? `less than ${node.limit} in length`
			: `at most ${node.limit} in length`
})

export type AfterDeclaration = declareRefinement<{
	kind: "after"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	operands: Date
	intersections: {
		after: "after"
	}
}>

export const AfterImplementation = defineBound({
	kind: "before",
	limitKind: "upper",
	operands: ["date"],
	writeDefaultDescription: (node) =>
		node.exclusive ? `after ${node.limit}` : `${node.limit} or later`
})

export type BeforeDeclaration = declareRefinement<{
	kind: "before"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	operands: Date
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export const BeforeImplementation = defineBound({
	kind: "before",
	limitKind: "upper",
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
