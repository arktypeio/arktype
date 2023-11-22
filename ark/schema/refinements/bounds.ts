import { constructorExtends, throwParseError, type extend } from "@arktype/util"
import { In } from "../io/compile.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { BasisKind, BoundKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { Attachments, Declaration, Node } from "../shared/node.js"
import type { RefinementAttachments } from "./refinement.js"
import {
	defineRefinement,
	type RefinementImplementationInput
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
	RefinementAttachments<Boundable>,
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
	if (basis.domain === "number" || basis.domain === "string") {
		return basis.domain
	}
	if (
		(basis.kind === "unit" && basis.is instanceof Array) ||
		(basis.kind === "proto" && constructorExtends(basis.proto, Array))
	) {
		return "array"
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
	createImplicitBasis: (node: BoundNode) => Attachments<kind>["implicitBasis"]
}) =>
	defineRefinement({
		// check this generic bound implementation against a concrete case
		// ("min"), then cast it to the expected parameterized definition
		kind: boundDefinition.kind as "min",
		keys: {
			limit: {},
			exclusive: {}
		},
		normalize: (schema) =>
			typeof schema === "object" ? schema : { limit: schema },
		writeInvalidBasisMessage: writeUnboundableMessage,
		writeDefaultDescription: boundDefinition.writeDefaultDescription,
		attach: (node) => {
			const comparator = `${boundDefinition.limitKind === "lower" ? ">" : "<"}${
				node.exclusive ? "" : "="
				// cast to lower bound comparator for internal checking
			}` as RelativeComparator<"lower">
			return {
				comparator,
				condition: `${In} ${comparator} ${node.limit}`,
				implicitBasis: boundDefinition.createImplicitBasis(node)
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

export type MinDeclaration = declareNode<{
	kind: "min"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	intersections: {
		min: "min"
		max: Disjoint | null
	}
}>

export const MinImplementation = defineBound({
	kind: "min",
	limitKind: "lower",
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "more than" : "at least"} ${node.limit}`,
	createImplicitBasis: (node) => node.cls.builtins.number
})

export type MaxDeclaration = declareNode<{
	kind: "max"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	intersections: {
		// TODO: Fix rightOf
		max: "max"
	}
}>

export const MaxImplementation = defineBound({
	kind: "max",
	limitKind: "upper",
	writeDefaultDescription: (node) =>
		`${node.exclusive ? "less than" : "at most"} ${node.limit}`,
	createImplicitBasis: (node) => node.cls.builtins.number
})

export type MinLengthDeclaration = declareNode<{
	kind: "minLength"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	intersections: {
		minLength: "minLength"
		maxLength: Disjoint | null
	}
}>

export const MinLengthImplementation = defineBound({
	kind: "minLength",
	limitKind: "lower",
	writeDefaultDescription: (node) =>
		node.exclusive
			? node.limit === 0
				? "non-empty"
				: `more than ${node.limit} in length`
			: node.limit === 1
			  ? "non-empty"
			  : `at least ${node.limit} in length`,
	// TODO: array
	createImplicitBasis: (node) => node.cls.builtins.string
})

export type MaxLengthDeclaration = declareNode<{
	kind: "maxLength"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	intersections: {
		maxLength: "maxLength"
	}
}>

export const MaxLengthImplementation = defineBound({
	kind: "maxLength",
	limitKind: "upper",
	writeDefaultDescription: (node) =>
		node.exclusive
			? `less than ${node.limit} in length`
			: `at most ${node.limit} in length`,
	// TODO: array
	createImplicitBasis: (node) => node.cls.builtins.string
})

export type AfterDeclaration = declareNode<{
	kind: "after"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"lower">
	intersections: {
		after: "after"
	}
}>

export const AfterImplementation = defineBound({
	kind: "before",
	limitKind: "upper",
	writeDefaultDescription: (node) =>
		node.exclusive ? `after ${node.limit}` : `${node.limit} or later`,
	createImplicitBasis: (node) => node.cls.builtins.date
})

export type BeforeDeclaration = declareNode<{
	kind: "before"
	schema: BoundSchema<number>
	inner: BoundInner<number>
	attach: BoundAttachments<"upper">
	intersections: {
		before: "before"
		after: Disjoint | null
	}
}>

export const BeforeImplementation = defineBound({
	kind: "before",
	limitKind: "upper",
	writeDefaultDescription: (node) =>
		node.exclusive ? `before ${node.limit}` : `${node.limit} or earlier`,
	createImplicitBasis: (node) => node.cls.builtins.date
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
