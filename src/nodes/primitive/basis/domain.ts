import type { Domain } from "../../../../dev/utils/src/main.js"
import { cached, getBaseDomainKeys } from "../../../../dev/utils/src/main.js"
import { InputParameterName } from "../../../compile/compile.js"
import { node } from "../../../main.js"
import { defineNode } from "../../node.js"
import type { definePrimitive } from "../primitive.js"
import type { BasisNode } from "./basis.js"

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

export type DomainConfig = definePrimitive<{
    kind: "domain"
    rule: NonEnumerableDomain
    meta: {}
    intersection: NonEnumerableDomain
}>

export interface DomainNode extends BasisNode<DomainConfig> {}

export const domainNode = defineNode<DomainNode>(
    {
        kind: "domain",
        compile: (rule) =>
            rule === "object"
                ? `((typeof ${InputParameterName} === "object" && ${InputParameterName} !== null) || typeof ${InputParameterName} === "function")`
                : `typeof ${InputParameterName} === "${rule}"`
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
