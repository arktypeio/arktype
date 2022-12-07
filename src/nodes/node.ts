import type {
    autocompleteString,
    Dictionary,
    evaluate,
    keySet,
    listable,
    PartialDictionary,
    subtype
} from "../utils/generics.js"
import type { ObjectTypeName, TypeName, Types } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node = NameNode | TypeNode | BranchNode

export type NameNode = autocompleteString<Keyword>

export type TypeNode = TypeNodes[TypeName]

export type BranchNode = {
    readonly [typeName in TypeName]?: listable<string | TypeNodes[typeName]>
}

export type TypeNodes = {
    [typeName in TypeName]: evaluate<
        AttributeNodes[typeName] | LiteralNodes[typeName]
    >
}

type AttributeNodes = evaluate<{
    [typeName in TypeName]: {
        readonly type: typeName
    } & (typeName extends keyof AttributeKeysByType
        ? Pick<BaseAttributes, AttributeKeysByType[typeName]>
        : {})
}>

type LiteralNodes = evaluate<{
    [typeName in TypeName]: Types[typeName] extends LiteralValue
        ? PrimitiveLiteralNode<Types[typeName]>
        : never
}>

export type BaseAttributes = {
    readonly type: TypeName
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

type AttributeKeysByType = subtype<
    PartialDictionary<TypeName, keyof BaseAttributes>,
    {
        object: "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
        string: "regex" | "bounds"
        number: "divisor" | "bounds"
    }
>

export type LiteralValue = string | number | boolean | bigint

export type PrimitiveLiteralNode<value extends LiteralValue = LiteralValue> = {
    readonly value: value
}

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}
