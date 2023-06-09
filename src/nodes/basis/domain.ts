import { In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import { defineNodeKind } from "../node.js"
import type { BasisKind, defineBasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"
import type { ClassNode } from "./class.js"
import type { ValueNode } from "./value.js"

export type DomainNode = defineBasisNode<
    {
        kind: "domain"
        rule: Domain
    },
    ClassNode | ValueNode
>

export const DomainNode = defineNodeKind<DomainNode>({
    kind: "domain",
    compile: (rule) =>
        rule === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${rule}"`,
    extend: (base) =>
        Object.assign(base, {
            level: "domain" as const,
            domain: base.rule,
            hasLevel: (level: BasisKind) => level === "domain",
            literalKeys: getBaseDomainKeys(base.rule)
        }),
    intersect: intersectBases,
    describe: (node) => node.rule
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
