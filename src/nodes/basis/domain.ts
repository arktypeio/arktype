import type { Domain } from "../../utils/domains.js"
import { type Constructor, getBaseDomainKeys } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import type { CompilationState } from "../compilation.js"
import { In } from "../compilation.js"
import { BasisNode } from "./basis.js"

export class DomainNode extends BasisNode<"domain"> {
    declare children: [Domain]
    domain: Domain

    constructor(public child: Domain) {
        super("domain", DomainNode.compile(child))
        this.children = [child]
        this.domain = child
    }

    static compile(domain: Domain) {
        return domain === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${domain}"`
    }

    toString() {
        return this.child
    }

    getConstructor(): Constructor | undefined {
        return this.child === "object"
            ? Object(this.child).constructor
            : undefined
    }

    literalKeysOf(): Key[] {
        return getBaseDomainKeys(this.child)
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("domain", this.child))
    }
}
