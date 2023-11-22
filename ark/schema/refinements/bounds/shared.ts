import { constructorExtends, throwParseError, type extend } from "@arktype/util"
import type { withAttributes } from "../../shared/declare.js"
import type { BasisKind, BoundKind } from "../../shared/define.js"
import type { Node } from "../../shared/node.js"
import type { RefinementAttachments } from "../refinement.js"

export type BoundInner<
	kind extends BoundKind,
	limit extends LimitLiteral
> = withAttributes<
	{ [_ in kind]: limit } & {
		readonly exclusive?: boolean
	}
>

export type LimitLiteral = number | string

export type BoundSchema<kind extends BoundKind, limit extends LimitLiteral> =
	| limit
	| BoundInner<kind, limit>

export type BoundLimit = number | string

export type BoundAttachments<limitKind extends LimitKind> = extend<
	RefinementAttachments<Boundable>,
	{
		comparator: RelativeComparator<limitKind>
	}
>

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

// export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
// 	`Bound kinds ${l} and ${r} are incompatible`

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
