import { TreeOf } from "@re-/tools"
import {
    ParseOptions,
    ReferencesTypeOptions,
    DefaultParseOptions
} from "./model.js"
import {
    Primitive,
    ExtractableKeyword,
    Str,
    Root
} from "./definitions/index.js"
import { StringLiteral } from "./definitions/str/fragment/reference/literal/stringLiteral.js"
import { SpaceOptions } from "./space.js"

export * from "./errors.js"

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

export type TypeOfContext<Space> = Required<ParseOptions> & {
    spaceConfig: SpaceOptions<keyof Space & string>
    seen: Record<string, boolean>
}

export type DefaultTypeOfContext = DefaultParseOptions & {
    seen: {}
    spaceConfig: {}
}
