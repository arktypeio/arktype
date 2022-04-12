import {
    CastWithExclusion,
    Evaluate,
    Func,
    InvalidPropertyError,
    IsAnyOrUnknown,
    KeyValuate,
    NonObject,
    NonRecursible,
    Recursible,
    TreeOf
} from "@re-/tools"
import {
    ParseConfig,
    ReferencesTypeOptions,
    DefaultParseOptions,
    CustomValidator
} from "./model.js"
import { Primitive, ExtractableKeyword, Str } from "./definitions/index.js"
import { StringLiteral } from "./definitions/str/fragment/reference/literal/stringLiteral.js"
import { validationError, ValidationErrors } from "./errors.js"

export * from "./errors.js"

export type MergeObjects<Base, Merged> = Evaluate<{
    [K in keyof Base | keyof Merged]: K extends keyof Merged
        ? Merged[K]
        : KeyValuate<Base, K>
}>

export type ShallowDefinition = Str.Definition | Primitive.Definition

export type ShallowExtractableDefinition =
    | StringLiteral.Definition
    | ExtractableKeyword
    | number
    | bigint

export type ExtractableDefinition = TreeOf<ShallowExtractableDefinition>

// Allow a user to extract types from arbitrary chains of props
export const typeDefProxy: any = new Proxy({}, { get: () => typeDefProxy })

export type ReferencesTypeConfig = Required<ReferencesTypeOptions>

export type TypeOfContext<Resolutions> = Required<ParseConfig> & {
    seen: Record<string, boolean>
}

export type DefaultTypeOfContext = DefaultParseOptions & {
    seen: {}
}

export const errorsFromCustomValidator = (
    customValidator: CustomValidator,
    args: Parameters<CustomValidator>
): ValidationErrors => {
    const result = customValidator(...args)
    if (result && typeof result === "string") {
        return validationError({ path: args[2].ctx.path, message: result })
    } else if (result) {
        return result as ValidationErrors
    }
    return {}
}
