import { In } from "../../../compile/compile.js"
import type { Domain } from "../../../../dev/utils/domains.js"
import { getBaseDomainKeys } from "../../../../dev/utils/objectKinds.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface DomainNode extends BasisNode<Domain> { }

export const domainNode = defineNodeKind<DomainNode>(
    {
        kind: "domain",
        parse: (input) => input,
        compile: (rule) => [
            rule === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${rule}"`
        ],
        intersect: intersectBases
    },
    (base) => ({
        domain: base.rule,
        literalKeys: getBaseDomainKeys(base.rule),
        description: base.rule
    })
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
