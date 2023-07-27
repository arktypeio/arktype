import type { Domain } from "@arktype/util"
import type { BaseRule } from "../base.js"
import { BaseNode } from "../base.js"
import type { NarrowSet } from "../constraints/narrow.js"

export interface PredicateRule extends BaseRule {
	readonly narrows?: NarrowSet
}

export abstract class PredicateNode extends BaseNode {
	abstract readonly domain: Domain
}
