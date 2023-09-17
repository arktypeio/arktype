import type { conform } from "@arktype/util"
import { Hkt } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../schema.js"
import { BaseNode, nodeParser } from "../schema.js"
import type { BasesByKind, Basis } from "./basis.js"
import { BaseConstraint, type Constraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { PrototypeNode } from "./prototype.js"
import type { BaseRefinement, RefinementsByKind } from "./refinement.js"

export interface BoundSchema extends BaseAttributes {
	readonly limit: number
	readonly exclusive: boolean
}

export type BoundNode = MinNode | MaxNode

export type BoundInput = number | BoundSchema

export class MinNode
	extends BaseConstraint<BoundSchema>
	implements BaseRefinement
{
	protected constructor(schema: BoundSchema) {
		super(schema)
	}

	readonly kind = "min"

	readonly comparator = `>${this.exclusive ? "" : "="}` as const

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], BoundInput>) => {
			return new MinNode(
				typeof input === "number" ? { limit: input, exclusive: false } : input
			)
		}
	})()

	static from = nodeParser(this)

	hash() {
		return ""
	}

	intersectSymmetric(other: MinNode) {
		return this.limit > other.limit ||
			(this.limit === other.limit && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Constraint) {
		if (other.kind === "max") {
			return this.limit > other.limit ||
				(this.limit === other.limit && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		return null
	}

	applicableTo(basis: Basis | undefined): basis is BoundableBasis {
		return boundable(basis)
	}

	writeDefaultDescription() {
		// Date
		// rule.exclusive
		// ? "after"
		// : "at or after"
		const comparison = this.exclusive ? "more than" : "at least"
		return `${comparison} ${this.limit}`
	}
}

export class MaxNode
	extends BaseConstraint<BoundSchema>
	implements BaseRefinement
{
	readonly kind = "max"

	protected constructor(schema: BoundSchema) {
		super(schema)
	}

	readonly comparator = `<${this.exclusive ? "" : "="}` as const

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], BoundInput>) => {
			return new MaxNode(
				typeof input === "number" ? { limit: input, exclusive: false } : input
			)
		}
	})()

	static from = nodeParser(this)

	hash() {
		return ""
	}

	applicableTo(basis: Basis | undefined): basis is BoundableBasis {
		return boundable(basis)
	}

	intersectOwnKeys(other: Node) {
		if (other.kind === "min") {
			return this.limit < other.limit ||
				(this.limit === other.limit && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		if (other.kind === "max") {
			return this.limit < other.limit ||
				(this.limit === other.limit && this.exclusive)
				? this
				: other
		}
		return null
	}

	intersectSymmetric(other: MaxNode) {
		return this.limit > other.limit ||
			(this.limit === other.limit && this.exclusive)
			? this
			: other
	}

	intersectAsymmetric(other: Constraint) {
		if (other.kind === "max") {
			return this.limit > other.limit ||
				(this.limit === other.limit && (this.exclusive || other.exclusive))
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
		return `${comparison} ${this.limit}`
	}
}

export type BoundKind = "date" | "number"

const boundable = (basis: Basis | undefined): basis is BoundableBasis => {
	if (basis === undefined) {
		return false
	}
	if (basis.kind === "domain") {
		return basis.domain === "number" || basis.domain === "string"
	}
	if (basis.kind === "prototype") {
		return basis.extendsOneOf(Array, Date)
	}
	return false
}

type BoundableBasis =
	| DomainNode<{ domain: "number" | "string" }>
	| PrototypeNode<{ prototype: typeof Array | typeof Date }>

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
