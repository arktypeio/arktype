import type { defined, keySet, subtype, xor } from "../../utils/generics.js"
import type { IntegerLiteral } from "../../utils/numericLiterals.js"
import type { dict, ObjectSubtypeName, TypeName } from "../../utils/typeOf.js"
import type { Node } from "../node.js"
import type { Bounds } from "../shared/bounds.js"
import type { ChildrenAttribute } from "./children.js"
import type { LiteralValue } from "./literal.js"
import type { RegexAttribute } from "./regex.js"

export type BaseAttributes<scope extends dict = dict> = {
    readonly type: TypeName
    // primitive attributes
    readonly literal?: LiteralValue
    readonly divisor?: number
    readonly regex?: RegexAttribute
    // object attributes
    readonly subtype?: ObjectSubtypeName
    readonly children?: ChildrenAttribute<scope>
    // shared attributes
    readonly bounds?: Bounds
}

export type AttributeName = keyof BaseAttributes

export type BaseAttributeType<k extends AttributeName> = defined<
    BaseAttributes[k]
>

export type Attributes<scope extends dict = dict> =
    AttributesByTypeName<scope>[TypeName]

export type AttributesByTypeName<scope extends dict> = subtype<
    { [k in TypeName]: BaseAttributes },
    {
        bigint: BigintAttributes
        boolean: BooleanAttributes
        null: NullAttributes
        number: NumberAttributes
        object: ObjectAttributes<scope>
        string: StringAttributes
        symbol: SymbolAttributes
        undefined: UndefinedAttributes
    }
>

export type BigintAttributes = subtype<
    BaseAttributes,
    {
        readonly type: "bigint"
        readonly literal?: IntegerLiteral
    }
>

export type BooleanAttributes = subtype<
    BaseAttributes,
    {
        readonly type: "boolean"
        readonly literal?: boolean
    }
>

export type NullAttributes = subtype<
    BaseAttributes,
    {
        readonly type: "null"
    }
>

export type NumberAttributes = subtype<
    BaseAttributes,
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
    BaseAttributes,
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
    BaseAttributes,
    {
        readonly type: "symbol"
    }
>

export type UndefinedAttributes = subtype<
    BaseAttributes,
    {
        readonly type: "undefined"
    }
>

export type ObjectAttributes<scope extends dict = dict> =
    UniversalObjectAttributes<scope> &
        (ArrayAttributes<scope> | FunctionAttributes<scope> | {})

type UniversalObjectAttributes<scope extends dict> = {
    readonly type: "object"
    readonly props?: dict<Node<scope>>
    readonly requiredKeys?: keySet
}

type ArrayAttributes<scope extends dict> = subtype<
    BaseAttributes<scope>,
    {
        readonly type: "object"
        readonly subtype: "array"
        readonly elements?: ElementsAttribute<scope>
        readonly bounds?: Bounds
    }
>

type ElementsAttribute<scope extends dict> =
    | Node<scope>
    | readonly Node<scope>[]

export type FunctionAttributes<scope extends dict> = subtype<
    BaseAttributes<scope>,
    {
        readonly type: "object"
        readonly subtype: "function"
    }
>
