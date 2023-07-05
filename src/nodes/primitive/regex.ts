import { intersectUniqueLists } from "@arktype/utils"
import { InputParameterName } from "../../compile/compile.js"
import type { BaseNodeMeta } from "../node.js"
import { defineNode } from "../node.js"
import type {
    definePrimitive,
    PrimitiveIntersection,
    PrimitiveNode
} from "./primitive.js"

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
    `${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
    literal.slice(1, literal.lastIndexOf("/"))

export const intersectRegex: PrimitiveIntersection<RegexConfig> =
    intersectUniqueLists

export interface RegexMeta extends BaseNodeMeta {}

export type RegexConfig = definePrimitive<{
    kind: "regex"
    rule: SerializedRegexLiteral
    intersectionGroup: readonly SerializedRegexLiteral[]
    meta: RegexMeta
}>

export interface RegexNode extends PrimitiveNode<RegexConfig> {}

export const regexNode = defineNode<RegexNode>(
    {
        kind: "regex",
        compile: (rule) => `${rule}.test(${InputParameterName})`
    },
    (base) => ({
        description: `matched by ${base.rule}`
    })
)
