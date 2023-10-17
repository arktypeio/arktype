import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement } from "./refinement.js"

export interface BoundChildren extends BaseAttributes {
	readonly rule: number
	readonly exclusive?: boolean
}

export type BoundSchema = number | BoundChildren

export abstract class BoundNode
	extends BaseConstraint<BoundChildren>
	implements BaseRefinement
{
	abstract comparator: string

	exclusive = this.children.exclusive ?? false

	hash() {
		return ""
	}

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
		return writeUnboundableMessage(`${basis}`)
	}
}

export class MinNode extends BoundNode {
	readonly kind = "min"
	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	// Date
	// rule.exclusive
	// ? "after"
	// : "at or after"
	comparisonDescription = this.exclusive ? "more than" : "at least"
	defaultDescription = `${this.comparisonDescription} ${this.rule}`

	static from(schema: BoundSchema) {
		return new MinNode(typeof schema === "number" ? { rule: schema } : schema)
	}

	hash() {
		return ""
	}

	intersectSymmetric(other: MinNode) {
		return this.rule > other.rule ||
			(this.rule === other.rule && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Node<ConstraintKind>): Disjoint | null {
		if (other.kind === "max") {
			return this.rule > other.rule ||
				(this.rule === other.rule && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		return null
	}
}

export class MaxNode extends BoundNode {
	readonly kind = "max"
	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	// Date
	// rule.exclusive
	// ? "before"
	// : "at or before"
	comparisonDescription = this.exclusive ? "less than" : "at most"
	defaultDescription = `${this.comparisonDescription} ${this.rule}`

	static from(schema: BoundSchema) {
		return new MaxNode(typeof schema === "number" ? { rule: schema } : schema)
	}

	hash() {
		return ""
	}

	intersectSymmetric(other: MaxNode) {
		return this.rule > other.rule ||
			(this.rule === other.rule && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Node<ConstraintKind>): Disjoint | null {
		if (other.kind === "max") {
			return this.rule > other.rule ||
				(this.rule === other.rule && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		return null
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
