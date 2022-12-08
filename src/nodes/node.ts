import type {
    autocompleteString,
    Dictionary,
    evaluate,
    keySet,
    List,
    listable,
    PartialDictionary,
    subtype
} from "../utils/generics.js"
import type { ObjectTypeName, TypeName, Types } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node = {
    readonly [typeName in TypeName]?: ConstraintsOf<typeName>
}

export type NarrowableTypeName = Exclude<
    TypeName,
    "symbol" | "undefined" | "null"
>

export type AliasResolutionKind = "none" | "shallow" | "deep"

export type ConstraintsOf<
    typeName extends TypeName,
    resolutionKind extends AliasResolutionKind = "none"
> = typeName extends NarrowableTypeName
    ?
          | true
          | (resolutionKind extends "none"
                ? BranchOf<typeName>
                : ResolvedBranchOf<typeName>)
          | (resolutionKind extends "deep"
                ? List<ResolvedBranchOf<typeName>>
                : List<BranchOf<typeName>>)
    : true

export type BranchOf<typeName extends NarrowableTypeName> =
    | string
    | ResolvedBranchOf<typeName>

export type ResolvedBranchOf<typeName extends NarrowableTypeName> =
    | AttributesOf<typeName>
    | LiteralOf<typeName>

type AttributesOf<typeName extends TypeName> =
    typeName extends keyof AttributeKeysByType
        ? Pick<BaseAttributes, AttributeKeysByType[typeName]>
        : never

type LiteralOf<typeName extends TypeName> = Types[typeName] extends LiteralValue
    ? PrimitiveLiteralNode<Types[typeName]>
    : never

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
