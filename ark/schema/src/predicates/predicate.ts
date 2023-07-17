import { NarrowNode } from "../constraints/narrow.js"
import type { NumberPredicate } from "./number.js"
import type { ObjectPredicate } from "./object.js"
import type { StringPredicate } from "./string.js"
import type { UnitPredicate } from "./unit.js"

export type Predicate =
	| UnitPredicate
	| ObjectPredicate
	| NumberPredicate
	| StringPredicate

export class PredicateBase {
	readonly narrow?: readonly NarrowNode[]
	readonly prop?: readonly PropNode[]
	readonly signature?: readonly SignatureConstraint[]

	constructor() {}
}
