import type { Domain } from "@arktype/utils"
import { cached, getBaseDomainKeys } from "@arktype/utils"
import { InputParameterName } from "../../../compile/compile.js"
import { node } from "../../../main.js"
import type { BaseNodeMeta } from "../../node.js"
import { defineNode } from "../../node.js"
import type { BasisNode, defineBasis } from "./basis.js"

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

export interface DomainMeta extends BaseNodeMeta {}

export type DomainConfig = defineBasis<{
    kind: "domain"
    rule: NonEnumerableDomain
    meta: DomainMeta
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
