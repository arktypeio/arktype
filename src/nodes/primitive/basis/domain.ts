import type { Domain } from "../../../../dev/utils/src/main.js"
import { cached, getBaseDomainKeys } from "../../../../dev/utils/src/main.js"
import { compileCheck, InputParameterName } from "../../../compile/compile.js"
import { node } from "../../../main.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type NonEnumerableDomain = Exclude<
    Domain,
    "null" | "undefined" | "boolean"
>

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
    bigint: "a bigint",
    boolean: "boolean",
    null: "null",
    number: "a number",
    object: "an object",
    string: "a string",
    symbol: "a symbol",
    undefined: "undefined"
} as const satisfies Record<Domain, string>

export interface DomainNode extends BasisNode<NonEnumerableDomain> {}

export const domainNode = defineNodeKind<DomainNode>(
    {
        kind: "domain",
        parse: (input) => input,
        compile: (rule, ctx) =>
            compileCheck(
                "domain",
                rule,
                rule === "object"
                    ? `((typeof ${InputParameterName} === "object" && ${InputParameterName} !== null) || typeof ${InputParameterName} === "function")`
                    : `typeof ${InputParameterName} === "${rule}"`,
                ctx
            ),
        intersect: intersectBases
    },
    (base) => {
        const literalKeys = getBaseDomainKeys(base.rule)
        return {
            domain: base.rule,
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            description: domainDescriptions[base.rule]
        }
    }
)
