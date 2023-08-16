import type { IdentityConstraint } from "../constraints/identity.js"
import { PredicateNode } from "./predicate.js"

export type UnitRule = {
	readonly identity: IdentityConstraint
}

export class UnitNode extends PredicateNode<unknown, UnitRule> {}
