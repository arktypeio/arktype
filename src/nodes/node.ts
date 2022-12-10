import type {
    autocompleteString,
    defined,
    Dictionary,
    isNarrowed,
    keySet,
    listable,
    stringKeyOf,
    subtype
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node<scope extends Dictionary = Dictionary> =
    | Identifier<scope>
    | Resolution

export type BaseNode = Identifier | BaseResolution

export type Identifier<scope extends Dictionary = Dictionary> = isNarrowed<
    stringKeyOf<scope>
> extends true
    ? Keyword | stringKeyOf<scope>
    : autocompleteString<Keyword>

export type BaseResolution = { readonly [k in TypeName]?: BaseConstraints }

export type Resolution<scope extends Dictionary = Dictionary> = subtype<
    BaseResolution,
    {
        readonly bigint?:
            | true
            | listable<Identifier<scope> | PrimitiveLiteral<IntegerLiteral>>
        readonly boolean?: true | PrimitiveLiteral<boolean>
        readonly null?: true
        readonly number?:
            | true
            | listable<
                  | Identifier<scope>
                  | PrimitiveLiteral<number>
                  | NumberAttributes
              >
        readonly object?: true | listable<Identifier<scope> | ObjectAttributes>
        readonly string?:
            | true
            | listable<
                  | Identifier<scope>
                  | PrimitiveLiteral<string>
                  | StringAttributes
              >
        readonly symbol?: true
        readonly undefined?: true
    }
>

export type ConstraintsOf<typeName extends TypeName> = defined<
    Resolution[typeName]
>

export type BaseConstraints = true | listable<Identifier | BaseKeyedConstraint>

export type ResolvedBaseConstraints = true | listable<BaseKeyedConstraint>

export type BaseKeyedConstraint = BaseAttributes | PrimitiveLiteral

export type BaseAttributes = {
    // primitive attributes
    readonly regex?: RegexAttribute
    readonly divisor?: number
    // object attributes
    readonly props?: Dictionary<BaseNode>
    readonly requiredKeys?: keySet
    readonly propTypes?: BasePropTypesAttribute
    readonly subtype?: ObjectTypeName
    // shared attributes
    readonly bounds?: Bounds
}

export type LiteralValue = string | number | boolean

export type PrimitiveLiteral<value extends LiteralValue = LiteralValue> = {
    readonly value: value
}

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}

type BasePropTypesAttribute = {
    readonly number?: BaseNode
    readonly string?: BaseNode
}

export type NumberAttributes = Pick<BaseAttributes, "divisor" | "bounds">

export type StringAttributes = Pick<BaseAttributes, "regex" | "bounds">

export type ObjectAttributes = Pick<
    BaseAttributes,
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>
