import { Evaluate, Iteration, TreeOf } from "@re-/tools"
import {
    ParseConfig,
    ReferencesTypeOptions,
    DefaultParseOptions,
    CustomValidator
} from "./model.js"
import { Literal, ExtractableKeyword, Str } from "./definitions/index.js"
import { StringLiteral } from "./definitions/str/reference/embeddedLiteral/stringLiteral.js"
import { validationError, ValidationErrors } from "./errors.js"

export * from "./errors.js"

export type Mergeable<T> = T extends {} ? T : {}

export type Merge<Base, Merged> = Evaluate<
    Omit<Mergeable<Base>, Extract<keyof Base, keyof Merged>> & Mergeable<Merged>
>

export type MergeAll<Types, Result = {}> = Types extends Iteration<
    unknown,
    infer Current,
    infer Remaining
>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Evaluate<Result>

export type ShallowDefinition = Str.Definition | Literal.Definition

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

export type Precedence<T extends any[], Skip = unknown> = T extends Iteration<
    any,
    infer Current,
    infer Remaining
>
    ? Current extends Skip
        ? Precedence<Remaining, Skip>
        : Current
    : [T]
