import { numberKeywords } from "./number.js"
import { stringKeywords } from "./string.js"

export namespace Keyword {
    export type Definition = keyof KeywordsToNodes

    export type Types = {
        [K in Definition]: GetGeneratedType<KeywordsToNodes[K]>
    }

    export const nodes = {
        ...stringKeywords,
        ...numberKeywords
    }

    export const matches = (def: string): def is Definition => def in nodes

    export const parse = (def: Definition) => nodes[def]

    type KeywordsToNodes = typeof nodes

    type KeywordNode = KeywordsToNodes[keyof KeywordsToNodes]

    type GetGeneratedType<N extends KeywordNode> = ReturnType<N["create"]>
}
