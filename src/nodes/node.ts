import type {
    autocompleteString,
    defined,
    evaluate,
    listable,
    subtype
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./attributes/bounds.js"
import type { ChildrenAttribute } from "./attributes/children.js"
import type { RegexAttribute } from "./attributes/regex.js"
import type { LiteralValue } from "./attributes/type.js"
import type { Keyword } from "./names.js"
import type { Branches } from "./union.js"

export type Node = NameNode | ResolutionNode

export type NameNode = autocompleteString<Keyword>

export type ResolutionNode = Attributes | Branches

export type BaseAttributes = {
    // primitive attributes
    readonly divisor?: number
    readonly regex?: RegexAttribute
    // object attributes
    readonly children?: ChildrenAttribute
    readonly subtype?: ObjectTypeName
    // shared attributes
    readonly bounds?: Bounds
}

export type AttributeName = keyof BaseAttributes

export type BaseAttributeType<k extends AttributeName> = defined<
    BaseAttributes[k]
>

type literal<t extends LiteralValue> = { readonly value: t }

export type Attributes = subtype<
    {
        readonly [k in TypeName]?:
            | true
            | listable<string | literal<LiteralValue> | BaseAttributes>
    },
    {
        readonly object?: true | listable<string | ObjectAttributes>
        readonly string?:
            | true
            | listable<string | literal<string> | StringAttributes>
        readonly number?:
            | true
            | listable<string | literal<number> | NumberAttributes>
        readonly bigint?: true | listable<string | literal<IntegerLiteral>>
        readonly boolean?: true | literal<boolean>
        readonly symbol?: true
        readonly null?: true
        readonly undefined?: true
    }
>

export type ObjectAttributes = evaluate<
    {
        readonly children?: ChildrenAttribute
    } & (
        | { readonly subtype: "Array"; readonly bounds?: Bounds }
        | { readonly subtype?: ObjectTypeName }
    )
>

export type StringAttributes = {
    readonly bounds?: Bounds
    readonly regex?: RegexAttribute
}

export type NumberAttributes = {
    readonly bounds?: Bounds
    readonly divisor?: number
}
