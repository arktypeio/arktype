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
	readonly rule: number
	readonly exclusive?: boolean
}

export type BoundSchema = number | BoundChildren

export abstract class BaseBound<nodeClass extends StaticBaseNode<BoundChildren>>
	extends BaseNode<BoundChildren, nodeClass>
	implements BaseRefinement
{
	abstract comparator: string

	static keyKinds = this.declareKeys({
		rule: "in",
		exclusive: "in"
	})

	exclusive = this.children.exclusive ?? false

	applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
		if (basis === undefined) {
			return false
		}
		if (basis.kind === "domain") {
			return basis.rule === "number" || basis.rule === "string"
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

export class MinNode extends BaseBound<typeof MinNode> {
	static readonly kind = "min"
	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	static from(schema: BoundSchema) {
		return new MinNode(typeof schema === "number" ? { rule: schema } : schema)
	}

	static intersections = this.defineIntersections({
		min: (l, r) =>
			l.rule > r.rule || (l.rule === r.rule && l.exclusive) ? l : r,
		max: (l, r) =>
			l.rule > r.rule || (l.rule === r.rule && (l.exclusive || r.exclusive))
				? Disjoint.from("bound", l, r)
				: null
	})

	static writeDefaultDescription(children: BoundChildren) {
		// Date
		// rule.exclusive
		// ? "after"
		// : "at or after"
		const comparisonDescription = children.exclusive ? "more than" : "at least"
		return `${comparisonDescription} ${children.rule}`
	}
}

export class MaxNode extends BaseBound<typeof MaxNode> {
	static readonly kind = "max"
	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	static intersections = this.defineIntersections({
		max: (l, r) =>
			l.rule > r.rule || (l.rule === r.rule && l.exclusive) ? l : r
	})

	static writeDefaultDescription(children: BoundChildren) {
		// Date
		// rule.exclusive
		// ? "before"
		// : "at or before"
		const comparisonDescription = children.exclusive ? "less than" : "at most"
		return `${comparisonDescription} ${children.rule}`
	}

	static from(schema: BoundSchema) {
		return new MaxNode(typeof schema === "number" ? { rule: schema } : schema)
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
