import { InputParameterName } from "../../compile/compile.js"
import { defineNode } from "../node.js"
import type { definePrimitive, PrimitiveNode } from "./primitive.js"

// converting a regex to a string alphabetizes the flags for us
export const serializeRegex = (regex: RegExp) =>
    `${regex}` as SerializedRegexLiteral

export type SerializedRegexLiteral = `/${string}/${string}`

export const sourceFromRegexLiteral = (literal: SerializedRegexLiteral) =>
    literal.slice(1, literal.lastIndexOf("/"))

export type RegexNodeConfig = definePrimitive<{
    kind: "regex"
    rule: SerializedRegexLiteral
    intersection: readonly SerializedRegexLiteral[]
    meta: {}
}>

export interface RegexNode extends PrimitiveNode<RegexNodeConfig> {}

export const regexNode = defineNode<RegexNode>(
    {
        kind: "regex",
        compile: (rule) => `${rule}.test(${InputParameterName})`
    },
    (base) => ({
        description: `matched by ${base.rule}`
    })
)
