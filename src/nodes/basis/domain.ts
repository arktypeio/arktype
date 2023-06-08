import { In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisLevel, BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type DomainNode = BasisNode<{
    rule: Domain
    level: "domain"
}>

export const DomainNode = defineNodeKind<DomainNode>({
    kind: "basis",
    compile: (rule) =>
        rule === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${rule}"`,
    construct: (base) =>
        Object.assign(base, {
            level: "domain" as const,
            domain: base.rule,
            hasLevel: (level: BasisLevel) => level === "domain",
            literalKeysOf: () => getBaseDomainKeys(base.rule)
        }),
    intersect: intersectBases,
    describe: (node) => node.rule
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
