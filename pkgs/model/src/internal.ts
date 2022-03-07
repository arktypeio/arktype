import { TreeOf } from "@re-/tools"
import { ParseTypeOptions, ReferencesTypeOptions } from "./model.js"
import {
    Primitive,
    StringLiteral,
    Fragment,
    ExtractableKeyword
} from "./definitions/index.js"

export * from "./errors.js"

export type ShallowDefinition = Fragment.Definition | Primitive.Definition

export type ShallowExtractableDefinition =
    | StringLiteral.Definition
    | ExtractableKeyword
    | number
    | bigint

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })
export const getTypeDefProxy = () => typeDefProxy

export type ParseConfig = Required<ParseTypeOptions>
export type ReferencesTypeConfig = Required<ReferencesTypeOptions>
