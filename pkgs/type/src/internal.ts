import { ElementOf, TreeOf } from "@re-/utils"
import { ParseTypeOptions } from "./parse.js"
import { Primitive, StringLiteral, Keyword, Str } from "./definition"

export * from "./errors.js"

export type ControlCharacters = [
    "|",
    "?",
    "(",
    ")",
    ",",
    "[",
    "]",
    "=",
    ">",
    " "
]

export type ControlCharacter = ElementOf<ControlCharacters>

export type ShallowDefinition = Str.Definition | Primitive.Definition

export type ShallowExtractableDefinition =
    | Keyword.Extractable
    | StringLiteral.Definition
    | Primitive.Definition

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition, true>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })
export const getTypeDefProxy = () => typeDefProxy

export type ParseConfig = Required<ParseTypeOptions>
