import type { keySet, subtype } from "../../utils/generics.js"
import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { dict, TypeName } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { Bounds } from "./bounds.js"
import type { LiteralValue } from "./literal.js"
import type { RegexAttribute } from "./regex.js"

export type Attributes =
    | BigintAttributes
    | BooleanAttributes
    | NullAttributes
    | NumberAttributes
    | ObjectAttributes
    | StringAttributes
    | UndefinedAttributes

export type BasePrimitiveAttributes = {
    readonly type: TypeName
    readonly literal?: LiteralValue
    readonly bounds?: Bounds
    readonly divisor?: number
    readonly regex?: RegexAttribute
}

export type ObjectAttributes = {
    readonly type: "object"
    readonly bounds?: Bounds
}

export type BigintAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "bigint"
        readonly literal?: IntegerLiteral
    }
>

export type BooleanAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "boolean"
        readonly literal?: boolean
    }
>

export type NullAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "null"
    }
>

export type NumberAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "number"
        readonly literal?: number
        readonly bounds?: Bounds
        readonly divisor?: number
    }
>

export type StringAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "string"
        readonly literal?: string
        readonly bounds?: Bounds
        readonly regex?: RegexAttribute
    }
>

export type UndefinedAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "undefined"
    }
>
