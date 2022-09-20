import type { InstanceOf } from "@re-/tools"
import { numberKeywords } from "./number.js"
import { stringKeywords } from "./string.js"

export namespace Keyword {
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
}
