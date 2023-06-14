import type { Domain } from "../../../utils/domains.js"
import { getBaseDomainKeys } from "../../../utils/objectKinds.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface DomainNode extends BasisNode<Domain> {}

export const domainNode = defineNodeKind<DomainNode>(
    {
        kind: "domain",
        parse: (input) => input,
        compile: (rule, s) =>
            s.check(
                "domain",
                rule,
                rule === "object"
                    ? `((typeof ${s.data} === "object" && ${s.data} !== null) || typeof ${s.data} === "function")`
                    : `typeof ${s.data} === "${rule}"`
            ),
        intersect: intersectBases
    },
    (base) => ({
        domain: base.rule,
        literalKeys: getBaseDomainKeys(base.rule),
        description: base.rule
    })
)
