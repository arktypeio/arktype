import { StringifyPossibleTypes, Split, Join, Unlisted } from "@re-do/utils"
import { DefinitionTypeError, UnknownTypeError } from "../../errors.js"
import { ParseTypeRecurseOptions } from "../../parse.js"
import { Fragment } from "./fragment.js"

export type ParseSplittableResult<
    Components = any[],
    Errors extends string = string
> = {
    Components: Components extends any[] ? Components : [Components]
    Errors: Errors
}

export type ParseSplittable<
    Delimiter extends string,
    Def extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    Components extends string[] = Split<Def, Delimiter>,
    ParsedComponents = {
        [I in keyof Components]: Fragment.Parse<
            Components[I] & string,
            TypeSet,
            Options
        >
    },
    ComponentErrors = {
        [I in keyof ParsedComponents]: ParsedComponents[I] extends UnknownTypeError
            ? ParsedComponents[I]
            : never
    }
> = ParseSplittableResult<
    ParsedComponents,
    StringifyPossibleTypes<
        Extract<ComponentErrors[keyof ComponentErrors], UnknownTypeError>
    >
>

export type ValidateSplittable<
    Delimiter extends string,
    Def extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    Components extends string[] = Split<Def, Delimiter>,
    ValidateDefinitions extends string[] = {
        [Index in keyof Components]: Fragment.Validate<
            Components[Index] & string,
            Components[Index] & string,
            DeclaredTypeName,
            ExtractTypesReferenced
        >
    },
    ValidatedDefinition extends string = Join<ValidateDefinitions, Delimiter>
> = ExtractTypesReferenced extends true
    ? Unlisted<ValidateDefinitions>
    : Def extends ValidatedDefinition
    ? Root
    : StringifyPossibleTypes<
          Extract<
              ValidateDefinitions[keyof ValidateDefinitions],
              UnknownTypeError
          >
      >

export type OptionalDefinition<Definition extends string = string> =
    `${Definition}?`

export type FunctionDefinition<
    Parameters extends string = string,
    Return extends string = string
> = `(${Parameters})=>${Return}`

export const isAFunctionDefinition = <D extends string>(definition: D) =>
    /\(.*\)\=\>.*/.test(definition) as D extends FunctionDefinition
        ? true
        : false

export type StringLiteralDefinition<Definition extends string = string> =
    Definition extends `${string} ${string}`
        ? `Spaces are not supported in string literal definitions.`
        : `'${Definition}'`

export type NumericStringLiteralDefinition<Definition extends number = number> =
    `${Definition}`

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
    | StringLiteralDefinition
    | number

/**
 * These types can be used to specify a type definition but
 * will never be used to represent a value at runtime, either
 * because they are abstract type constructs (e.g. "never") or
 * because a more specific type will always be extracted (e.g.
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
