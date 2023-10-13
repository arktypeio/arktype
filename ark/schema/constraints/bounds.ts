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
	readonly exclusive: boolean
}

export interface BoundSchemaObject extends BaseAttributes {
	readonly rule: number
	readonly exclusive?: boolean
}

export type BoundNode = MinNode | MaxNode

export type BoundSchema = number | BoundSchemaObject

const parseBoundSchema = (schema: BoundSchema): BoundChildren =>
	typeof schema === "number"
		? { rule: schema, exclusive: false }
		: { ...schema, exclusive: schema.exclusive ?? false }

export class MinNode
	extends BaseConstraint<BoundChildren>
	implements BaseRefinement
{
	readonly kind = "min"

	constructor(schema: BoundSchema) {
		super(parseBoundSchema(schema))
	}

	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	hash() {
		return ""
	}

	intersectSymmetric(other: MinNode) {
		return this.rule > other.rule ||
			(this.rule === other.rule && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Node<ConstraintKind>) {
		if (other.kind === "max") {
			return this.rule > other.rule ||
				(this.rule === other.rule && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		return null
	}

	applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
		return boundable(basis)
	}

	writeDefaultDescription() {
		// Date
		// rule.exclusive
		// ? "after"
		// : "at or after"
		const comparison = this.exclusive ? "more than" : "at least"
		return `${comparison} ${this.rule}`
	}
}

export class MaxNode
	extends BaseConstraint<BoundChildren>
	implements BaseRefinement
{
	readonly kind = "max"

	constructor(schema: BoundSchema) {
		super(parseBoundSchema(schema))
	}

	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	hash() {
		return ""
	}

	intersectSymmetric(other: MaxNode) {
		return this.rule > other.rule ||
			(this.rule === other.rule && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Node<ConstraintKind>) {
		if (other.kind === "max") {
			return this.rule > other.rule ||
				(this.rule === other.rule && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		return null
	}

	applicableTo(basis: Node<BasisKind> | undefined): basis is BoundableBasis {
		return boundable(basis)
	}

	writeDefaultDescription() {
		// Date
		// rule.exclusive
		// ? "before"
		// : "at or before"
		const comparison = this.exclusive ? "less than" : "at most"
		return `${comparison} ${this.rule}`
	}
}

export type BoundKind = "date" | "number"

const boundable = (
	basis: Node<BasisKind> | undefined
): basis is BoundableBasis => {
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
