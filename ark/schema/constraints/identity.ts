import type { conform } from "@arktype/util"
import { Hkt, reify, stringify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { compileSerializedValue } from "../io/compile.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface IdentitySchema<value = unknown> extends ConstraintSchema {
	is: value
}

export class IdentityNode<
	schema extends IdentitySchema = IdentitySchema
> extends ConstraintNode<schema> {
	readonly kind = "identity"
	declare infer: schema["is"]

	static from = reify(
		class extends Hkt {
			f = (
				input: conform<this[Hkt.key], IdentitySchema>
			): IdentityNode<typeof input> => {
				return new IdentityNode(input)
			}
		}
	)

	hash() {
		return compileSerializedValue(this.is)
	}

	writeDefaultDescription() {
		// TODO: add reference to for objects
		return stringify(this.is)
	}

	reduceWith(other: Constraint) {
		return other.kind === "identity"
			? Disjoint.from("identity", this, other)
			: null
	}
}

export const identityNode = IdentityNode.from
