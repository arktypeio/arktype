import { numberKeywordsToNodes } from "../../../../parser/operand/unenclosed/keyword/numberKeyword.js"
import { stringKeywordsToNodes } from "../../../../parser/operand/unenclosed/keyword/stringKeyword.js"
import { typeKeywordsToNodes } from "../../../../parser/operand/unenclosed/keyword/typeKeyword.js"

export namespace Keyword {
    export type Definition = keyof KeywordsToNodes

    export type Types = {
        [K in Definition]: GetGeneratedType<KeywordsToNodes[K]>
    }

    export const nodes = {
        ...typeKeywordsToNodes,
        ...stringKeywordsToNodes,
        ...numberKeywordsToNodes
    }

    export const numberNodes = numberKeywordsToNodes

    export type OfTypeNumber = keyof typeof numberKeywordsToNodes

    export const stringNodes = stringKeywordsToNodes

    export type OfTypeString = keyof typeof stringKeywordsToNodes

    export const matches = (def: string): def is Definition => def in nodes

    export const parse = (def: Definition) => nodes[def]

    type KeywordsToNodes = typeof nodes

    type KeywordNode = KeywordsToNodes[keyof KeywordsToNodes]

    type GetGeneratedType<N extends KeywordNode> = ReturnType<N["create"]>
}

export const typeKeywordsToNodes = {
    any: new anyNode(),
    bigint: new bigintNode(),
    boolean: new booleanNode(),
    false: new falseNode(),
    function: new functionNode(),
    never: new neverNode(),
    null: new nullNode(),
    object: new objectNode(),
    symbol: new symbolNode(),
    true: new trueNode(),
    undefined: new undefinedNode(),
    unknown: new unknownNode(),
    void: new voidNode()
}
