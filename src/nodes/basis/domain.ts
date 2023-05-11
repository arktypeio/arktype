import type { Domain } from "../../utils/domains.js"
import { baseKeysByDomain, type constructor } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { CompilationState } from "../compilation.js"
import { In } from "../compilation.js"
import { BasisNode } from "./basis.js"

export class DomainNode extends BasisNode<"domain"> {
    constructor(public domain: Domain) {
        super("domain", DomainNode.compile(domain))
    }

    static compile(domain: Domain) {
        return domain === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${domain}"`
    }

    toString() {
        return stringify(this.domain)
    }

    getConstructor(): constructor | undefined {
        return this.domain === "object"
            ? Object(this.domain).constructor
            : undefined
    }

    literalKeysOf(): Key[] {
        return [...baseKeysByDomain[this.domain]]
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("domain", this.domain))
    }
}
