import type { NarrowSet } from "../constraints/narrow.js"
import type { NumberNode } from "./number.js"
import type { ObjectNode } from "./object.js"
import type { StringNode } from "./string.js"
import type { UnitNode } from "./unit.js"

export type Predicate = UnitNode | ObjectNode | NumberNode | StringNode

export class PredicateNode {
	readonly narrows?: NarrowSet

	constructor() {}
}
