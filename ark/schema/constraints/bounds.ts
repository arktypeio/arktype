import { throwParseError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import {
	type BaseAttributes,
	BaseNode,
	type Node,
	type StaticBaseNode
} from "../node.js"
import type { BasisKind } from "./basis.js"
import { getBasisName } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement, RefinementContext } from "./refinement.js"

export interface BoundChildren extends BaseAttributes {
	boundKind: BoundKind
	exclusive?: boolean
}

export abstract class BaseBound<
		children extends BoundChildren,
		nodeClass extends StaticBaseNode<children>
	>
	extends BaseNode<children, nodeClass>
	implements BaseRefinement
{
	abstract comparator: string

	exclusive = this.children.exclusive ?? false

	applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
		return this.boundKind === getBoundKind(basis)
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return writeUnboundableMessage(getBasisName(basis))
	}
}

export interface MinChildren extends BoundChildren {
	readonly min: number
}

export type ExpandedMinSchema = Omit<MinChildren, "boundKind">

export type MinSchema = number | ExpandedMinSchema

export class MinNode extends BaseBound<MinChildren, typeof MinNode> {
	static readonly kind = "min"
	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	static readonly keyKinds = this.declareKeys({
		min: "in",
		exclusive: "in",
		boundKind: "in"
	})

	static from(schema: MinSchema, ctx: RefinementContext) {
		const boundKind = getBoundKind(ctx.basis)
		return new MinNode(
			typeof schema === "number"
				? { min: schema, boundKind }
				: { ...schema, boundKind }
		)
	}

	static readonly intersections = this.defineIntersections({
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r),
		max: (l, r) =>
			l.min > r.max || (l.min === r.max && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	})

	static writeDefaultDescription(children: MinChildren) {
		const comparisonDescription =
			children.boundKind === "date"
				? children.exclusive
					? "after"
					: "at or after"
				: children.exclusive
				? "more than"
				: "at least"
		return `${comparisonDescription} ${children.min}`
	}
}

export interface MaxChildren extends BoundChildren {
	readonly max: number
}

export type ExpandedMaxSchema = Omit<MaxChildren, "boundKind">

export type MaxSchema = number | ExpandedMaxSchema

export class MaxNode extends BaseBound<MaxChildren, typeof MaxNode> {
	static readonly kind = "max"
	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	static readonly intersections = this.defineIntersections({
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r)
	})

	static readonly keyKinds = this.declareKeys({
		max: "in",
		exclusive: "in",
		boundKind: "in"
	})

	static writeDefaultDescription(children: MaxChildren) {
		const comparisonDescription =
			children.boundKind === "date"
				? children.exclusive
					? "before"
					: "at or before"
				: children.exclusive
				? "less than"
				: "at most"
		return `${comparisonDescription} ${children.max}`
	}

	static from(schema: MaxSchema, ctx: RefinementContext) {
		const boundKind = getBoundKind(ctx.basis)
		return new MaxNode(
			typeof schema === "number"
				? { max: schema, boundKind }
				: { ...schema, boundKind }
		)
	}
}

const getBoundKind = (basis: Node<BasisKind> | undefined): BoundKind => {
	if (basis === undefined) {
		return throwParseError(writeUnboundableMessage("unknown"))
	}
	if (basis.domain === "number" || basis.domain === "string") {
		return basis.domain
	}
	if (
		(basis.kind === "unit" && basis.unit instanceof Array) ||
		(basis.kind === "proto" && basis.extendsOneOf(Array))
	) {
		return "array"
	}
	if (
		(basis.kind === "unit" && basis.unit instanceof Date) ||
		(basis.kind === ("proto" as never) &&
			(basis as {} as ProtoNode).extendsOneOf(Date))
	) {
		return "date"
	}
	return throwParseError(writeUnboundableMessage(basis.basisName))
}

type BoundableBasis =
	| DomainNode<"number" | "string">
	| ProtoNode<typeof Array | typeof Date>

const unitsByBoundKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundKind = keyof typeof unitsByBoundKind

export type LimitKind = "min" | "max"

export const writeIncompatibleRangeMessage = (l: BoundKind, r: BoundKind) =>
	`Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
