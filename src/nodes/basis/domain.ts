import { In } from "../../compile/compilation.js"
import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import { BaseNode } from "../node.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { intersectBases } from "./basis.js"

export class DomainNode extends BaseNode<"basis"> implements BasisDefinition {
    constructor(public rule: Domain) {
        const condition =
            rule === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${rule}"`
        if (BaseNode.nodes.basis[condition]) {
            return BaseNode.nodes.basis[condition] as DomainNode
        }
        super("basis", condition)
    }

    readonly domain = this.rule

    readonly level = "domain"

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    literalKeysOf(): PropertyKey[] {
        return getBaseDomainKeys(this.rule)
    }

    toString() {
        return this.domain
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
