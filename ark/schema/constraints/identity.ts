import type { conform } from "@arktype/util"
import { stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseNode } from "../type.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export class IdentityConstraint extends ConstraintNode<unknown> {
	readonly kind = "identity"

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.rule)
	}

	intersectRules(other: Constraint) {
		return other.allows(this.rule)
			? this.rule
			: Disjoint.from("unit", this, other)
	}
}

declare const create: <
	const o extends {
		[k in keyof o]: {
			[k2 in keyof o[k]]: o[k][k2] extends () => infer r ? r : never
		}
	}
>(
	o: conform<o, { [k in keyof o]: { [k2 in keyof o[k]]: () => o[k][k2] } }>
) => o

// { a: { b: number } }
const z = create({ a: { b: () => 1, c: () => 5n }, b: { e: () => "" } }) //>?
//    ^?
