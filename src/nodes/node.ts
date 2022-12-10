import type {
    autocompleteString,
    defined,
    Dictionary,
    evaluate,
    isNarrowed,
    keySet,
    listable,
    stringKeyOf,
    subtype
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectSubtypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node<alias extends string = string> =
    | Identifier<alias>
    | Resolution<alias>

export type BaseNode = Identifier | BaseResolution

export type Identifier<alias extends string = string> =
    isNarrowed<alias> extends true
        ? Keyword | alias
        : autocompleteString<Keyword>

export type BaseResolution = { readonly [k in TypeName]?: BaseConstraints }

export type Resolution<alias extends string = string> = subtype<
    BaseResolution,
    {
        readonly bigint?:
            | true
            | listable<Identifier<alias> | PrimitiveLiteral<IntegerLiteral>>
        readonly boolean?: true | PrimitiveLiteral<boolean>
        readonly null?: true
        readonly number?:
            | true
            | listable<
                  | Identifier<alias>
                  | PrimitiveLiteral<number>
                  | NumberAttributes
              >
        readonly object?: true | listable<Identifier<alias> | ObjectAttributes>
        readonly string?:
            | true
            | listable<
                  | Identifier<alias>
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
    readonly subtype?: ObjectSubtypeName
    // shared attributes
    readonly bounds?: Bounds
}

export type Attributes = evaluate<
    BaseAttributes & {
        props?: Dictionary<Node>
        propTypes?: PropTypesAttribute
    }
>

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

export type NumberAttributes = Pick<Attributes, "divisor" | "bounds">

export type StringAttributes = Pick<Attributes, "regex" | "bounds">

export type ObjectAttributes = Pick<
    Attributes,
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>
