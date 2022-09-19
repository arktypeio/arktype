import type { InstanceOf } from "@re-/tools"
import { numberKeywords } from "./number.js"
import type { PureKeyword } from "./pure.js"
import { pureKeywords } from "./pure.js"
import { stringKeywords } from "./string.js"

export namespace Keyword {
    export type Definition = keyof KeywordsToNodes

    export type TypeKeyword = PureKeyword | "string" | "number"

    export type Types = {
        [K in Definition]: GetGeneratedType<InstanceOf<KeywordsToNodes[K]>>
    }

    export const nodes = {
        ...pureKeywords,
        ...stringKeywords,
        ...numberKeywords
    }

    export const matches = (def: string): def is Definition => def in nodes

    export const parse = (def: Definition) => new nodes[def]()

    type KeywordsToNodes = typeof nodes

    type KeywordNode = InstanceOf<KeywordsToNodes[keyof KeywordsToNodes]>

    type GetGeneratedType<N extends KeywordNode> = ReturnType<N["generate"]>
}
