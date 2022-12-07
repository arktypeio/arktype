import type {
    autocompleteString,
    Dictionary,
    evaluate,
    keySet,
    listable
} from "../utils/generics.js"
import type { IntegerLiteral } from "../utils/numericLiterals.js"
import type { ObjectTypeName, TypeName } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import type { Keyword } from "./names.js"
import type { RegexAttribute } from "./regex.js"

export type Node = NameNode | ResolutionNode

export type NameNode = autocompleteString<Keyword>

export type ResolutionNode = ResolvedNode

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

export type ResolvedNode = ObjectNode | StringNode | NumberNode

export type ObjectNode = DefineAttributeNode<
    "object",
    "subtype" | "props" | "requiredKeys" | "propTypes" | "bounds"
>

export type StringNode = DefineAttributeNode<"string", "regex" | "bounds">

export type NumberNode = DefineAttributeNode<"number", "divisor" | "bounds">

export type BigintNode = {}

type DefineAttributeNode<
    typeName extends TypeName,
    key extends keyof BaseAttributes
> = evaluate<{ readonly type: typeName } & Pick<BaseAttributes, key>>

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}
