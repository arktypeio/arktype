import {
    DiffSetsResult,
    filterChars,
    isAlphaNumeric,
    List,
    stringify,
    TreeOf
} from "@re-do/utils"
import { Num, StringLiteral } from "./index.js"

export * from "./root.js"
import { Root } from "./root.js"

// These are the non-literal types we can extract from a value at runtime
export const namedExtractableTypes = {
    bigint: BigInt(0),
    true: true as true,
    false: false as false,
    null: null,
    symbol: Symbol(),
    undefined: undefined,
    function: (...args: any[]) => null as any
}

export type NamedExtractableTypeMap = typeof namedExtractableTypes

export type ExtractableTypeName = keyof NamedExtractableTypeMap

export type ExtractableType =
    | ExtractableTypeName
    | StringLiteral.Definition
    | Num.Definition

export type ExtractableDefinition = TreeOf<ExtractableType, true>

/**
 * These types can be used to specify a type definition but
 * will never be used to represent a value at runtime, either
 * because they are abstract type constructs (e.g. "never") or
 * because a more specific type will always be from (e.g.
 * "boolean", which will always evaluate as "true" or "false")
 */
let placeholder: any
export const unextractableTypes = {
    unknown: placeholder as unknown,
    any: placeholder as any,
    object: placeholder as object,
    boolean: placeholder as boolean,
    void: placeholder as void,
    never: placeholder as never,
    string: placeholder as string,
    number: placeholder as number
}
export type UnextractableTypes = typeof unextractableTypes

export type UnextractableTypeName = keyof UnextractableTypes

export const builtInTypes = { ...namedExtractableTypes, ...unextractableTypes }

export type BuiltInTypes = typeof builtInTypes

export type BuiltInTypeName = keyof BuiltInTypes

export type ParseTypeRecurseOptions = Required<ParseTypeOptions>

export type ParseTypeOptions = {
    onCycle?: Root.Definition
    seen?: any
    deepOnCycle?: boolean
    onResolve?: Root.Definition
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export type UnvalidatedTypeSet = { [K in string]: Root.Definition }

export const stringifyDefinition = (definition: unknown) =>
    stringify(definition, { quotes: "none" })

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringifyDefinition(definition)} ${
        path.length ? `at path ${path.join("/")} ` : ""
    }is invalid. ${baseDefinitionTypeError}`

export const baseDefinitionTypeError =
    "Definitions must be strings, numbers, or objects."

export type DefinitionTypeError = typeof baseDefinitionTypeError

export const getBaseTypeName = (definition: string) =>
    filterChars(definition, isAlphaNumeric)
