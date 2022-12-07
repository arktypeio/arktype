import type {
    autocompleteString,
    Dictionary,
    evaluate,
    keySet,
    List
} from "../utils/generics.js"
import type { ObjectTypeName, TypeName, Types } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node = BranchableNode | BranchNode

export type NameNode = autocompleteString<Keyword>

export type BranchableNode = NameNode | ResolutionNode

export type BranchNode = List<BranchableNode>

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

export type ResolutionNode =
    | ObjectNode
    | StringNode
    | NumberNode
    | BigintNode
    | BooleanNode
    | SymbolNode
    | NullNode
    | UndefinedNode

export type ObjectNode = DefineAttributeNode<
    "object",
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>

export type LiteralValue = string | number | boolean | bigint

export type PrimitiveLiteralNode<value extends LiteralValue = LiteralValue> = {
    readonly value: value
}

export type StringNode = DefineAttributeNode<"string", "regex" | "bounds">

export type NumberNode = DefineAttributeNode<"number", "divisor" | "bounds">

export type BigintNode = DefineAttributeNode<"bigint">

export type BooleanNode = DefineAttributeNode<"boolean">

export type SymbolNode = DefineAttributeNode<"symbol">

export type UndefinedNode = DefineAttributeNode<"undefined">

export type NullNode = DefineAttributeNode<"null">

type DefineAttributeNode<
    typeName extends TypeName,
    key extends keyof BaseAttributes = never
> =
    | evaluate<{ readonly type: typeName } & Pick<BaseAttributes, key>>
    | (Types[typeName] extends LiteralValue
          ? PrimitiveLiteralNode<Types[typeName]>
          : never)

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}
