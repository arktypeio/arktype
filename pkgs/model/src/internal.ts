import { TreeOf } from "@re-/tools"
import { ParseTypeOptions, ReferencesTypeOptions } from "./model.js"
import { Primitive, StringLiteral, Keyword, Str } from "./definitions"

export * from "./errors.js"

export type ShallowDefinition = Str.Definition | Primitive.Definition

export type ShallowExtractableDefinition =
    | Keyword.Extractable
    | StringLiteral.Definition
    | Primitive.Definition

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })
export const getTypeDefProxy = () => typeDefProxy

export type ParseConfig = Required<ParseTypeOptions>
export type ReferencesTypeConfig = Required<ReferencesTypeOptions>
