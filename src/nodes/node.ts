import type {
    defined,
    Dictionary,
    keySet,
    listable,
    subtype
} from "../utils/generics.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { RegexAttribute } from "./regex.js"

export type BaseNode = { readonly [k in TypeName]?: BaseConstraints }

export type Node = subtype<
    BaseNode,
    {
        readonly bigint?: true | listable<PrimitiveLiteral<bigint>>
        readonly boolean?: true | PrimitiveLiteral<boolean>
        readonly null?: true
        readonly number?:
            | true
            | listable<PrimitiveLiteral<number> | NumberAttributes>
        readonly object?: true | listable<ObjectAttributes>
        readonly string?:
            | true
            | listable<PrimitiveLiteral<string> | StringAttributes>
        readonly symbol?: true
        readonly undefined?: true
    }
>

export type ConstraintsOf<typeName extends TypeName> = defined<Node[typeName]>

export type BaseConstraints = true | listable<string | BaseKeyedConstraint>

export type ResolvedBaseConstraints = true | listable<BaseKeyedConstraint>

export type BaseKeyedConstraint = BaseAttributes | PrimitiveLiteral

export type BaseAttributes = {
    // primitive attributes
    readonly regex?: RegexAttribute
    readonly divisor?: number
    // object attributes
    readonly props?: Dictionary<Node>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectTypeName
    // shared attributes
    readonly bounds?: Bounds
}

export type LiteralValue = string | number | boolean | bigint

export type PrimitiveLiteral<value extends LiteralValue = LiteralValue> = {
    readonly value: value
}

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}

export type NumberAttributes = Pick<BaseAttributes, "divisor" | "bounds">

export type StringAttributes = Pick<BaseAttributes, "regex" | "bounds">

export type ObjectAttributes = Pick<
    BaseAttributes,
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>
