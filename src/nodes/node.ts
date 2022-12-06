import type { autocompleteString, defined, xor } from "../utils/generics.js"
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
    readonly type: TypeName
    // primitive attributes
    readonly divisor?: number
    readonly regex?: RegexAttribute
    // object attributes
    readonly children?: ChildrenAttribute
    // shared attributes
    readonly subtype?: LiteralValue
    readonly bounds?: Bounds
}

export type AttributeName = keyof BaseAttributes

export type BaseAttributeType<k extends AttributeName> = defined<
    BaseAttributes[k]
>

export type Attributes =
    | BigintAttributes
    | BooleanAttributes
    | NullAttributes
    | NumberAttributes
    | ObjectAttributes
    | StringAttributes
    | SymbolAttributes
    | UndefinedAttributes

export type BigintAttributes = {
    readonly type: "bigint"
    readonly subtype?: IntegerLiteral
}

export type BooleanAttributes = {
    readonly type: "boolean"
    readonly subtype?: boolean
}

export type NullAttributes = {
    readonly type: "null"
}

export type NumberAttributes = {
    readonly type: "number"
} & xor<
    { readonly subtype?: number },
    {
        readonly bounds?: Bounds
        readonly divisor?: number
    }
>

export type StringAttributes = {
    readonly type: "string"
} & xor<
    { readonly subtype?: string },
    {
        readonly bounds?: Bounds
        readonly regex?: RegexAttribute
    }
>

export type SymbolAttributes = {
    readonly type: "symbol"
}

export type UndefinedAttributes = {
    readonly type: "undefined"
}

export type ObjectAttributes = {
    readonly type: "object"
    readonly children?: ChildrenAttribute
} & (
    | { readonly subtype: "Array"; readonly bounds?: Bounds }
    | { readonly subtype?: ObjectTypeName }
)
