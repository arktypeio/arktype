import type {
    autocompleteString,
    defined,
    listable,
    PartialDictionary,
    subtype
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./attributes/bounds.js"
import type { ChildrenAttribute } from "./attributes/children.js"
import type { RegexAttribute } from "./attributes/regex.js"
import type { LiteralValue } from "./attributes/type.js"
import type { Keyword } from "./names.js"

export type Node = NameNode | ResolutionNode

export type NameNode = autocompleteString<Keyword>

export type BaseTypeResolution =
    | true
    | listable<string | literal<LiteralValue> | BaseAttributes>

export type ResolutionNode = subtype<
    {
        readonly [k in TypeName]?: BaseTypeResolution
    },
    {
        readonly object?: true | listable<string | AttributesByType["object"]>
        readonly string?:
            | true
            | listable<string | literal<string> | AttributesByType["string"]>
        readonly number?:
            | true
            | listable<string | literal<number> | AttributesByType["number"]>
        readonly bigint?: true | listable<string | literal<IntegerLiteral>>
        readonly boolean?: true | literal<boolean>
        readonly symbol?: true
        readonly null?: true
        readonly undefined?: true
    }
>

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

export const attributeKeysByType = {
    object: ["subtype", "bounds", "children"],
    string: ["regex", "bounds"],
    number: ["divisor", "bounds"]
} as const satisfies PartialDictionary<TypeName, readonly AttributeName[]>

type AttributeKeysByType = typeof attributeKeysByType

export type TypeNameWithAttributes = keyof AttributeKeysByType

export type AttributesByType = {
    [k in TypeName]: k extends TypeNameWithAttributes
        ? {
              [attributeKey in AttributeKeysByType[k][number]]?: BaseAttributeType<attributeKey>
          }
        : {}
}

export type AttributesOf<typeName extends TypeName> = AttributesByType[typeName]
