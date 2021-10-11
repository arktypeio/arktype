import { Recursible, transform } from "@re-do/utils"
import { definitionTypeError } from "./errors.js"

export const formatTypes = <T>(definition: T): T => {
    const recurse = (definition: unknown, path: string[]): any => {
        if (typeof definition === "string") {
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

// These are the types we can extract from a value at runtime
export const extractableTypes = {
    bigint: BigInt(0),
    string: "",
    true: true as true,
    false: false as false,
    number: 0,
    null: null,
    symbol: Symbol(),
    undefined: undefined,
    function: (...args: any[]) => null as any
}

export type ExtractableTypes = typeof extractableTypes

export type ExtractableTypeName = keyof ExtractableTypes

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
    never: placeholder as never
}
export type UnextractableTypes = typeof unextractableTypes

export type UnextractableTypeName = keyof UnextractableTypes

export const builtInTypes = { ...extractableTypes, ...unextractableTypes }

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

export type ListDefinition<Definition extends string = string> =
    `${Definition}[]`

export type OrDefinition<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type OptionalDefinition<Definition extends string = string> =
    `${Definition}?`

export type UnvalidatedDefinition = string | UnvalidatedObjectDefinition

export type UnvalidatedObjectDefinition<Definition = any> =
    Definition extends Recursible<Definition>
        ? {
              [K in string | number]: any
          }
        : never

export type UnvalidatedTypeSet = { [K in string]: UnvalidatedDefinition }

export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })

export const getTypeDefProxy = () => typeDefProxy
