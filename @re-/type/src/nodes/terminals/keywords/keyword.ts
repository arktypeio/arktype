import type { InstanceOf } from "@re-/tools"
import { AnyNode } from "./any.js"
import { BigintNode } from "./bigint.js"
import { BooleanNode } from "./boolean.js"
import { FunctionNode } from "./function.js"
import { NeverNode } from "./never.js"
import { NullNode } from "./null.js"
import { numberKeywords, NumberNode } from "./number.js"
import { ObjectNode } from "./object.js"
import { stringKeywords, StringNode } from "./string.js"
import { SymbolNode } from "./symbol.js"
import { UndefinedNode } from "./undefined.js"
import { UnknownNode } from "./unknown.js"
import { VoidNode } from "./void.js"

export const typeKeywords = {
    any: AnyNode,
    bigint: BigintNode,
    boolean: BooleanNode,
    function: FunctionNode,
    never: NeverNode,
    null: NullNode,
    number: NumberNode,
    object: ObjectNode,
    string: StringNode,
    symbol: SymbolNode,
    undefined: UndefinedNode,
    unknown: UnknownNode,
    void: VoidNode
}

export type TypeKeyword = keyof typeof typeKeywords

export type Definition = keyof KeywordsToNodes

export type TypeKeyword = TypeKeyword | "string" | "number"

export type Types = {
    [K in Definition]: GetGeneratedType<InstanceOf<KeywordsToNodes[K]>>
}

export const nodes = {
    ...typeKeywords,
    ...stringKeywords,
    ...numberKeywords
}

export const matches = (def: string): def is Definition => def in nodes

type KeywordsToNodes = typeof nodes

export type KeywordNode = InstanceOf<KeywordsToNodes[keyof KeywordsToNodes]>

type GetGeneratedType<N extends KeywordNode> = ReturnType<N["generate"]>
