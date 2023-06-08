import { In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import type { BasisNode } from "./basis.js"
import { defineBasisNode } from "./basis.js"

export type DomainNode = BasisNode<{
    rule: Domain
    level: "domain"
}>

export const DomainNode = defineBasisNode<DomainNode>({
    level: "domain",
    domain: (rule) => rule,
    compile: (rule) =>
        rule === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${rule}"`,
    describe: (node) => node.rule
})

// literalKeysOf(): PropertyKey[] {
//     return getBaseDomainKeys(this.rule)
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
