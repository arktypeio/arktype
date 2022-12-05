import type {
    autocompleteString,
    defined,
    subtype,
    xor
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
    readonly type: TypeName
    // primitive attributes
    readonly divisor?: number
    readonly regex?: RegexAttribute
    // object attributes
    readonly children?: ChildrenAttribute
    // shared attributes
    readonly subtype?: ObjectTypeName | LiteralValue
    readonly bounds?: Bounds
}

export type AttributeName = keyof BaseAttributes

export type BaseAttributeType<k extends AttributeName> = defined<
    BaseAttributes[k]
>

export type Attributes = AttributesByTypeName[TypeName]

export type AttributesByTypeName = subtype<
    { [k in TypeName]: BaseAttributes },
    {
        bigint: BigintAttributes
        boolean: BooleanAttributes
        null: NullAttributes
        number: NumberAttributes
        object: ObjectAttributes
        string: StringAttributes
        symbol: SymbolAttributes
        undefined: UndefinedAttributes
    }
>

type typeAttributes<attributes extends BaseAttributes> = attributes

export type BigintAttributes = typeAttributes<{
    readonly type: "bigint"
    readonly literal?: IntegerLiteral
}>

export type BooleanAttributes = typeAttributes<{
    readonly type: "boolean"
    readonly literal?: boolean
}>

export type NullAttributes = typeAttributes<{
    readonly type: "null"
}>

export type NumberAttributes = typeAttributes<
    {
        readonly type: "number"
    } & xor<
        { readonly literal?: number },
        {
            readonly bounds?: Bounds
            readonly divisor?: number
        }
    >
>

export type StringAttributes = typeAttributes<
    {
        readonly type: "string"
    } & xor<
        { readonly literal?: string },
        {
            readonly bounds?: Bounds
            readonly regex?: RegexAttribute
        }
    >
>

export type SymbolAttributes = typeAttributes<{
    readonly type: "symbol"
}>

export type UndefinedAttributes = typeAttributes<{
    readonly type: "undefined"
}>

export type ObjectAttributes = typeAttributes<
    {
        readonly type: "object"
        readonly children?: ChildrenAttribute
    } & (
        | { readonly subtype: "array"; readonly bounds?: Bounds }
        | { readonly subtype: "function" }
        | {}
    )
>
