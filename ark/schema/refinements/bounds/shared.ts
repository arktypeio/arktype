import { constructorExtends, throwParseError, type extend } from "@arktype/util"
import type {
	BaseNodeDeclaration,
	declareNode,
	withAttributes
} from "../../shared/declare.js"
import {
	defineNode,
	type BasisKind,
	type NodeImplementationInput,
	type RefinementKind,
	type instantiateNodeImplementation
} from "../../shared/define.js"
import type { Declaration, Node } from "../../shared/node.js"
import type { RefinementAttachments } from "../refinement.js"
import type { RefinementImplementationInput } from "../shared.js"

// TODO: NodeKind
export type BoundInner<
	kind extends string,
	limit extends LimitLiteral
> = withAttributes<
	{ [_ in kind]: limit } & {
		readonly exclusive?: boolean
	}
>

export type LimitLiteral = number | string

// TODO: NodeKind
export type BoundSchema<kind extends string, limit extends LimitLiteral> =
	| limit
	| BoundInner<kind, limit>

// kind, implicitBasis, limitKind

export type BoundDeclarationInput = {
	kind: string
	limitKind: LimitKind
	limitValue: LimitLiteral
	implicitBasis: Boundable
}

// TODO: update to NodeKind
export type declareBound<input extends BoundDeclarationInput> = declareNode<{
	kind: input["kind"]
	schema: BoundSchema<input["kind"], input["limitValue"]>
	inner: BoundInner<input["kind"], input["limitValue"]>
	attach: BoundAttachments<input["limitKind"]>
	intersections: {}
}>

export type BoundImplementationInput<d extends BaseNodeDeclaration> = extend<
	RefinementImplementationInput<d>,
	{}
>

export function defineBound<
	kind extends RefinementKind,
	input extends BoundImplementationInput<Declaration<kind>>
>(input: { kind: kind } & input): instantiateNodeImplementation<input>
export function defineBound(input: NodeImplementationInput<any>) {
	return defineNode(input)
}

export type BoundLimit = number | string

export type BoundAttachments<limitKind extends LimitKind> = extend<
	RefinementAttachments<Boundable>,
	{
		comparator: RelativeComparator<limitKind>
	}
>

const unitsByBoundKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundKind = keyof typeof unitsByBoundKind

export type LimitKind = "min" | "max"

export type RelativeComparator<kind extends LimitKind = LimitKind> = {
	min: ">" | ">="
	max: "<" | "<="
}[kind]

export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
	`Bound kinds ${l} and ${r} are incompatible`

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type NumericallyBoundable = string | number | readonly unknown[]

export type Boundable = NumericallyBoundable | Date

export const getBoundKind = (basis: Node<BasisKind> | undefined): BoundKind => {
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
