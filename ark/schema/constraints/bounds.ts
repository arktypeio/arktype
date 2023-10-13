import type { Comparator } from "arktype/internal/parser/string/shift/operator/bounds.js"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../node.js"
import type { BasisKind } from "./basis.js"
import type { ConstraintKind } from "./constraint.js"
import { BaseConstraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { ProtoNode } from "./proto.js"
import type { BaseRefinement } from "./refinement.js"

export interface BoundSchema extends BaseAttributes {
	readonly rule: number
	readonly exclusive?: boolean
}

const parseBoundSchema = (schema: BoundSchema) =>
	typeof schema === "number"
		? { rule: schema, exclusive: false }
		: { ...schema, exclusive: schema.exclusive ?? false }

export abstract class BoundNode
	extends BaseConstraint
	implements BaseRefinement
{
	readonly rule: number
	readonly exclusive: boolean
	abstract comparator: Comparator

	constructor(public schema: BoundSchema) {
		super(schema)
		this.rule = schema.rule
		this.exclusive = schema.exclusive ?? false
	}

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
}

export class MinNode extends BoundNode {
	readonly kind = "min"
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

	writeDefaultDescription() {
		// Date
		// rule.exclusive
		// ? "after"
		// : "at or after"
		const comparison = this.exclusive ? "more than" : "at least"
		return `${comparison} ${this.rule}`
	}
}

export class MaxNode extends BoundNode {
	readonly kind = "max"
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
