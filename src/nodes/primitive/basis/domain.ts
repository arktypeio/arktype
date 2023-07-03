import type { Domain } from "../../../../dev/utils/src/main.js"
import { cached, getBaseDomainKeys } from "../../../../dev/utils/src/main.js"
import { InputParameterName } from "../../../compile/compile.js"
import { node } from "../../../main.js"
import { type Constraint, definePrimitiveNode } from "../primitive.js"
import type { BaseBasis } from "./basis.js"
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

export type DomainConstraint = Constraint<"domain", NonEnumerableDomain, {}>

export interface DomainNode extends BaseBasis<DomainConstraint> {}

export const domainNode = definePrimitiveNode<DomainNode>(
    {
        kind: "domain",
        parse: (input) => input,
        compileRule: (rule) =>
            rule === "object"
                ? `((typeof ${InputParameterName} === "object" && ${InputParameterName} !== null) || typeof ${InputParameterName} === "function")`
                : `typeof ${InputParameterName} === "${rule}"`,
        intersect: intersectBases
    },
    (base) => {
        const literalKeys = getBaseDomainKeys(base.children)
        return {
            domain: base.children,
            literalKeys,
            keyof: cached(() => node.literal(...literalKeys)),
            description: domainDescriptions[base.children]
        }
    }
)
