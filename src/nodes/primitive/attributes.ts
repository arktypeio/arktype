import type { defined, subtype, xor } from "../../utils/generics.js"
import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { TypeName } from "../../utils/typeOf.js"
import type { Bounds } from "../bounds.js"
import type { LiteralValue } from "./literal.js"
import type { RegexAttribute } from "./regex.js"

export type BasePrimitiveAttributes = {
    readonly type: PrimitiveTypeName
    readonly literal?: LiteralValue
    readonly bounds?: Bounds
    readonly divisor?: number
    readonly regex?: RegexAttribute
}

export type PrimitiveTypeName = Exclude<TypeName, "object">

export type PrimitiveAttributes = AttributesByPrimitive[PrimitiveTypeName]

export type AttributesByPrimitive = subtype<
    { [k in PrimitiveTypeName]: BasePrimitiveAttributes },
    {
        bigint: BigintAttributes
        boolean: BooleanAttributes
        null: NullAttributes
        number: NumberAttributes
        string: StringAttributes
        symbol: SymbolAttributes
        undefined: UndefinedAttributes
    }
>

export type PrimitiveAttributeName = keyof BasePrimitiveAttributes

export type PrimitiveAttributeType<k extends PrimitiveAttributeName> = defined<
    BasePrimitiveAttributes[k]
>

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
    } & xor<
        { readonly literal?: number },
        {
            readonly bounds?: Bounds
            readonly divisor?: number
        }
    >
>

export type StringAttributes = subtype<
    BasePrimitiveAttributes,
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

export type SymbolAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "symbol"
    }
>

export type UndefinedAttributes = subtype<
    BasePrimitiveAttributes,
    {
        readonly type: "undefined"
    }
>
