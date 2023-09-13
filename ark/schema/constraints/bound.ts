import type { conform } from "@arktype/util"
import { Hkt } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseSchema } from "../schema.js"
import { parser } from "../schema.js"
import type { Basis } from "./basis.js"
import type { Constraint } from "./constraint.js"
import type { DomainNode } from "./domain.js"
import type { PrototypeNode } from "./prototype.js"
import { RefinementNode } from "./refinement.js"

export interface BoundSchema extends BaseSchema {
	readonly limit: number
	readonly exclusive: boolean
}

export type BoundNode = MinNode | MaxNode

export type BoundInput = number | BoundSchema

export class MinNode extends RefinementNode<BoundSchema> {
	protected constructor(schema: BoundSchema) {
		super(schema)
	}

	readonly kind = "min"

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], BoundInput>) => {
			return new MinNode(
				typeof input === "number" ? { limit: input, exclusive: false } : input
			)
		}
	})()

	static from = parser(this)

	hash() {
		return ""
	}

	reduceWith(other: Constraint) {
		if (other.kind === "max") {
			return this.limit > other.limit ||
				(this.limit === other.limit && (this.exclusive || other.exclusive))
				? Disjoint.from("bound", this, other)
				: null
		}
		if (other.kind === "min") {
			return this.limit > other.limit ||
				(this.limit === other.limit && this.exclusive)
				? this
				: other
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

export class MaxNode extends RefinementNode<BoundSchema> {
	readonly kind = "max"

	protected constructor(schema: BoundSchema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], BoundInput>) => {
			return new MaxNode(
				typeof input === "number" ? { limit: input, exclusive: false } : input
			)
		}
	})()

	static from = parser(this)

	hash() {
		return ""
	}

	applicableTo(basis: Basis | undefined): basis is BoundableBasis {
		return boundable(basis)
	}

	reduceWith(other: Constraint) {
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
	if (basis.hasKind("domain")) {
		return basis.rule === "number" || basis.rule === "string"
	}
	if (basis.hasKind("prototype")) {
		return basis.extendsOneOf(Array, Date)
	}
	return false
}

type BoundableBasis =
	| DomainNode<{ rule: "number" | "string" }>
	| PrototypeNode<{ rule: typeof Array | typeof Date }>

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
