import { DeepTreeOf, Key, TreeOf } from "@re-do/utils"

// These are the types we can extract from a value at runtime
export type ExtractableDefinitionMap = {
    bigint: bigint
    string: string
    true: true
    false: false
    number: number
    null: null
    symbol: symbol
    undefined: undefined
    function: (...args: any[]) => any
}

export type ExtractableDefinition = keyof ExtractableDefinitionMap

/**
 * These types can be used to specify a type definition but
 * will never be used to represent a value at runtime, either
 * because they are abstract type constructs (e.g. "never") or
 * because a more specific type will always be extracted (e.g.
 * "boolean", which will always evaluate as "true" or "false")
 */
export type DefinitionOnlyMap = {
    unknown: unknown
    any: any
    object: object
    boolean: boolean
    void: void
    never: never
}

export type BuiltInDefinitionMap = ExtractableDefinitionMap & DefinitionOnlyMap

export type BuiltInDefinition = keyof BuiltInDefinitionMap

export type FunctionDefinition<
    Parameters extends string = string,
    Return extends string = string
> = `(${Parameters})=>${Return}`

export type ListDefinition<Definition extends string = string> =
    `${Definition}[]`

export type OrDefinition<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type OptionalDefinition<Definition extends string = string> =
    `${Definition}?`

export type UnvalidatedDefinition = string | UnvalidatedObjectDefinition

export type UnvalidatedObjectDefinition = { [K in string | number]: any }

export type UnvalidatedTypeSet = { [K in string]: UnvalidatedDefinition }

export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDef() })

export const getTypeDef = () => typeDefProxy
