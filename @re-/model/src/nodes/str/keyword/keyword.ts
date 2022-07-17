import { Base } from "../base.js"
import {
    IntegerKeyword,
    NumberKeyword,
    NumberKeywordNode
} from "./numberKeyword.js"
import {
    AlphaKeyword,
    AlphaNumKeyword,
    EmailKeyword,
    LowerKeyword,
    StringKeyword,
    StringKeywordNode,
    UpperKeyword
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
    any: AnyKeyword,
    bigint: BigintKeyword,
    boolean: BooleanKeyword,
    false: FalseKeyword,
    function: FunctionKeyword,
    never: NeverKeyword,
    null: NullKeyword,
    object: ObjectKeyword,
    symbol: SymbolKeyword,
    true: TrueKeyword,
    undefined: UndefinedKeyword,
    unknown: UnknownKeyword,
    void: VoidKeyword,
    // String-typed
    string: StringKeyword,
    email: EmailKeyword,
    alpha: AlphaKeyword,
    alphanum: AlphaNumKeyword,
    lower: LowerKeyword,
    upper: UpperKeyword,
    // Number-typed
    number: NumberKeyword,
    integer: IntegerKeyword
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
