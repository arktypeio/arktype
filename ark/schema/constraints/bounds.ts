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
import type { BaseRefinement } from "./refinement.js"

export interface BoundChildren extends BaseAttributes {
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
		if (basis === undefined) {
			return false
		}
		if (basis.kind === "domain") {
			return basis.domain === "number" || basis.domain === "string"
		}
		if (basis.kind === "proto") {
			return basis.extendsOneOf(Array, Date)
		}
		return false
	}

	writeInvalidBasisMessage(basis: Node<BasisKind> | undefined) {
		return writeUnboundableMessage(getBasisName(basis))
	}
}

export interface MinChildren extends BoundChildren {
	readonly min: number
}

export type MinSchema = number | MinChildren

export class MinNode extends BaseBound<MinChildren, typeof MinNode> {
	static readonly kind = "min"
	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	static readonly keyKinds = this.declareKeys({
		min: "in",
		exclusive: "in"
	})

	static from(schema: MinSchema) {
		return new MinNode(typeof schema === "number" ? { min: schema } : schema)
	}

	static readonly intersections = this.defineIntersections({
		min: (l, r) => (l.min > r.min || (l.min === r.min && l.exclusive) ? l : r),
		max: (l, r) =>
			l.min > r.max || (l.min === r.max && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	})

	static writeDefaultDescription(children: MinChildren) {
		// Date
		// rule.exclusive
		// ? "after"
		// : "at or after"
		const comparisonDescription = children.exclusive ? "more than" : "at least"
		return `${comparisonDescription} ${children.min}`
	}
}

export interface MaxChildren extends BoundChildren {
	readonly max: number
}

export type MaxSchema = number | MaxChildren

export class MaxNode extends BaseBound<MaxChildren, typeof MaxNode> {
	static readonly kind = "max"
	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	static readonly intersections = this.defineIntersections({
		max: (l, r) => (l.max > r.max || (l.max === r.max && l.exclusive) ? l : r)
	})

	static readonly keyKinds = this.declareKeys({
		max: "in",
		exclusive: "in"
	})

	static writeDefaultDescription(children: MaxChildren) {
		// Date
		// rule.exclusive
		// ? "before"
		// : "at or before"
		const comparisonDescription = children.exclusive ? "less than" : "at most"
		return `${comparisonDescription} ${children.max}`
	}

	static from(schema: MaxSchema) {
		return new MaxNode(typeof schema === "number" ? { max: schema } : schema)
	}
}

export type BoundKind = "date" | "number"

type BoundableBasis =
	| DomainNode<"number" | "string">
	| ProtoNode<typeof Array | typeof Date>

const unitsByBoundedKind = {
	date: "",
	number: "",
	string: "characters",
	array: "elements"
} as const

export type BoundableDataKind = keyof typeof unitsByBoundedKind

export type LimitKind = "min" | "max"

export const writeIncompatibleRangeMessage = (
	l: BoundableDataKind,
	r: BoundableDataKind
) => `Bound kinds ${l} and ${r} are incompatible`

export type NumericallyBoundableData = string | number | readonly unknown[]

export const writeUnboundableMessage = <root extends string>(
	root: root
): writeUnboundableMessage<root> =>
	`Bounded expression ${root} must be a number, string, Array, or Date`

export type writeUnboundableMessage<root extends string> =
	`Bounded expression ${root} must be a number, string, Array, or Date`
