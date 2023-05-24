import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { In } from "../compilation.js"
import { defineNode } from "../node.js"
import { BasisNode } from "./basis.js"

export class DomainNode extends BasisNode<"domain", Domain> {
    readonly kind = "basis"
    readonly level = "domain"

    constructor(public domain: Domain) {
        super()
    }

    static compile(domain: Domain) {
        return [
            domain === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${domain}"`
        ]
    }

    literalKeysOf(): Key[] {
        return getBaseDomainKeys(this.rule)
    }

    describe() {
        return this.domain
    }
}

// getConstructor(): Constructor | undefined {
//     return this.child === "object"
//         ? Object(this.child).constructor
//         : undefined
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
