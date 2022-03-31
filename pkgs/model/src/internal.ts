import { KeyValuate, TreeOf } from "@re-/tools"
import {
    ParseOptions,
    ReferencesTypeOptions,
    DefaultParseOptions
} from "./model.js"
import { Primitive, ExtractableKeyword, Str } from "./definitions/index.js"
import { StringLiteral } from "./definitions/str/fragment/reference/literal/stringLiteral.js"

export * from "./errors.js"

export type MergeOptions<Base, Merged> = {
    [K in keyof Base | keyof Merged]: K extends keyof Merged
        ? Merged[K]
        : KeyValuate<Base, K>
}

export type ShallowDefinition = Str.Definition | Primitive.Definition

export type ShallowExtractableDefinition =
    | StringLiteral.Definition
    | ExtractableKeyword
    | number
    | bigint

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })
export const getTypeDefProxy = () => typeDefProxy

export type ReferencesTypeConfig = Required<ReferencesTypeOptions>

export type TypeOfContext<Resolutions> = Required<ParseOptions> & {
    // space: TypeSpaceOptions<keyof Resolutions & string>
    seen: Record<string, boolean>
}

export type DefaultTypeOfContext = DefaultParseOptions & {
    seen: {}
}
