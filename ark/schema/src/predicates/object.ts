import type { PrototypeNode } from "../constraints/prototype.js"
import { PredicateNode } from "./predicate.js"

export class ObjectNode extends PredicateNode {
	readonly instance?: PrototypeNode
}
