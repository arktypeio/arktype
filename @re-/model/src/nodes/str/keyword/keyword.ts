import { Base } from "../base.js"
import {
    IntegerKeyword,
    NonNegativeKeyword,
    NumberKeyword,
    NumberKeywordNode,
    PositiveKeyword
} from "./numberKeyword.js"
import {
    AlphaKeyword,
    AlphaNumericKeyword,
    CharacterKeyword,
    EmailKeyword,
    LowercaseKeyword,
    StringKeyword,
    StringKeywordNode,
    UppercaseKeyword
} from "./stringKeyword.js"
import {
    AnyKeyword,
    BigintKeyword,
    BooleanKeyword,
    FalseKeyword,
    FunctionKeyword,
    NeverKeyword,
    NullKeyword,
    ObjectKeyword,
    SymbolKeyword,
    TrueKeyword,
    UndefinedKeyword,
    UnknownKeyword,
    VoidKeyword
} from "./typeKeyword.js"

const keywordsToNodes = {
    symbol: SymbolKeyword,
    function: FunctionKeyword,
    true: TrueKeyword,
    false: FalseKeyword,
    undefined: UndefinedKeyword,
    null: NullKeyword,
    any: AnyKeyword,
    unknown: UnknownKeyword,
    void: VoidKeyword,
    never: NeverKeyword,
    object: ObjectKeyword,
    boolean: BooleanKeyword,
    bigint: BigintKeyword,
    // String subtypes
    string: StringKeyword,
    email: EmailKeyword,
    alpha: AlphaKeyword,
    alphanumeric: AlphaNumericKeyword,
    lowercase: LowercaseKeyword,
    uppercase: UppercaseKeyword,
    character: CharacterKeyword,
    // Number subtypes
    number: NumberKeyword,
    integer: IntegerKeyword,
    positive: PositiveKeyword,
    nonnegative: NonNegativeKeyword
}

type KeywordsToNodes = typeof keywordsToNodes

type KeywordNode = KeywordsToNodes[keyof KeywordsToNodes]

type KeywordsByNodeType<NodeType> = {
    [K in keyof KeywordsToNodes]: KeywordsToNodes[K] extends NodeType
        ? K
        : never
}[keyof KeywordsToNodes]

type GetGeneratedType<Node extends KeywordNode> = ReturnType<
    InstanceType<Node>["generate"]
>

export namespace Keyword {
    export type Definition = keyof KeywordsToNodes

    export type Types = {
        [K in Definition]: GetGeneratedType<KeywordsToNodes[K]>
    }

    export type OfTypeNumber = KeywordsByNodeType<NumberKeywordNode>

    export type OfTypeString = KeywordsByNodeType<StringKeywordNode>

    export const matches = (def: string): def is Definition =>
        def in keywordsToNodes

    export const parse: Base.Parsing.Parser<Definition> = (def, ctx) => {
        return new keywordsToNodes[def](def as never, ctx)
    }
}
