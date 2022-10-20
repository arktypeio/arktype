import type { Dictionary } from "@arktype/tools"
import type { Base } from "../../base/base.js"
import { numberSubtypeKeywords, stringSubtypeKeywords } from "./subtype.js"
import { typeKeywords } from "./type.js"

// TODO: ensure all keywords matched to their nodes
export const keywords = {
    ...typeKeywords,
    ...stringSubtypeKeywords,
    ...numberSubtypeKeywords
}

export type Keyword = keyof Keywords

export type Keywords = {
    any: any
    bigint: bigint
    boolean: boolean
    false: false
    never: never
    null: null
    number: number
    object: object
    string: string
    symbol: symbol
    true: true
    undefined: undefined
    unknown: unknown
    void: void
    array: unknown[]
    dictionary: Dictionary
    Function: Function
    // String subtypes
    email: string
    alphaonly: string
    alphanumeric: string
    lowercase: string
    uppercase: string
    // Number subtypes
    integer: number
}

export const isTopType = (
    node: Base.Node
): node is typeof typeKeywords["any"] | typeof typeKeywords["unknown"] =>
    node === keywords.any || node === keywords.unknown
