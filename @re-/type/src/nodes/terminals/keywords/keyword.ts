import type { InstanceOf } from "@re-/tools"
import type { Base } from "../../base.js"
import { AnyNode } from "./any.js"
import { BigintNode } from "./bigint.js"
import { BooleanNode } from "./boolean.js"
import { FunctionNode } from "./function.js"
import { NeverNode } from "./never.js"
import { NullNode } from "./null.js"
import type { NumberSubtypeKeyword } from "./number.js"
import { NumberNode, numberTypedKeywords } from "./number.js"
import { ObjectNode } from "./object.js"
import type { StringSubtypeDefinition, StringSubtypeKeyword } from "./string.js"
import { StringNode, stringTypedKeywords } from "./string.js"
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

export type SubtypeKeyword = StringSubtypeKeyword | NumberSubtypeKeyword

export type SubtypeDefinition = StringSubtypeDefinition | NumberSubtypeKeyword

export type KeywordDefinition = keyof KeywordsToNodes

export type KeywordTypes = {
    [K in KeywordDefinition]: GetGeneratedType<InstanceOf<KeywordsToNodes[K]>>
}

export type InferKeyword<Definition extends KeywordDefinition> =
    KeywordTypes[Definition]

export const keywordNodes = {
    ...typeKeywords,
    ...stringTypedKeywords,
    ...numberTypedKeywords
}

export const parseKeyword = (def: KeywordDefinition) =>
    new keywordNodes[def](def as never)

export const matchesKeyword = (def: string): def is KeywordDefinition =>
    def in keywordNodes

type KeywordsToNodes = typeof keywordNodes

export type KeywordNode = InstanceOf<KeywordsToNodes[keyof KeywordsToNodes]>

type GetGeneratedType<N extends KeywordNode> = ReturnType<N["generate"]>
