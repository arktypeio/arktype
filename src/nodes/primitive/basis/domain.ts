import type { Domain } from "../../../../dev/utils/src/main.js"
import { cached, getBaseDomainKeys } from "../../../../dev/utils/src/main.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type NonEnumerableDomain = Exclude<
    Domain,
    "null" | "undefined" | "boolean"
>

export interface DomainNode extends BasisNode<NonEnumerableDomain> {}

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
    (base) => {
        const literalKeys = getBaseDomainKeys(base.rule)
        return {
            domain: base.rule,
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            description: base.rule
        }
    }
)
