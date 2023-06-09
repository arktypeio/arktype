import { In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisKind, BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type DomainNode = BasisNode<"domain", Domain>

export const DomainNode = defineNodeKind<DomainNode>({
    kind: "domain",
    compile: (rule) =>
        rule === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${rule}"`,
    extend: (base) => ({
        domain: base.rule,
        literalKeys: getBaseDomainKeys(base.rule)
    }),
    intersect: intersectBases,
    describe: (node) => node.rule
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
