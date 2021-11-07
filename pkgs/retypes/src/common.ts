import { transform } from "@re-do/utils"
import { Root } from "./components"
import { definitionTypeError } from "./errors.js"

export const formatTypes = <T>(definition: T): T => {
    const recurse = (definition: unknown, path: string[]): any => {
        if (typeof definition === "number") {
            return definition
        } else if (typeof definition === "string") {
            return definition.replace(" ", "") as any
        } else if (typeof definition === "object") {
            return transform(definition as any, ([k, v]) => [
                k,
                recurse(v, [...path, k])
            ])
        } else {
            throw new Error(definitionTypeError(definition, path))
        }
    }
    return recurse(definition, [])
}

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

export type ListDefinition<Definition extends string = string> =
    `${Definition}[]`

export type OrDefinition<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type OptionalDefinition<Definition extends string = string> =
    `${Definition}?`

export type UnvalidatedTypeSet = { [K in string]: Root.Definition }

export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })

export const getTypeDefProxy = () => typeDefProxy
