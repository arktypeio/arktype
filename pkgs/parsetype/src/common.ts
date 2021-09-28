import { Exact, Key, LimitDepth } from "@re-do/utils"

export type BuiltInDefinitionMap = {
    string: string
    boolean: boolean
    number: number
    null: null
    undefined: undefined
    unknown: unknown
    any: any
    true: true
    false: false
    object: object
    void: void
    symbol: symbol
    never: never
}

export type BuiltInDefinition = keyof BuiltInDefinitionMap

export type ListDefinition<Definition extends string = string> =
    `${Definition}[]`

export type OrDefinition<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type OptionalDefinition<Definition extends string = string> =
    `${Definition}?`

export type ObjectDefinition<Definition = object> = Definition extends any[]
    ? never
    : { [K in string]: any }

export type ObjectListDefinition<
    Definition extends ObjectDefinition = ObjectDefinition
> = [Definition]

export type UnvalidatedDefinition =
    | string
    | ObjectDefinition
    | ObjectListDefinition

export type TreeOf<T, KeyType extends Key = string> =
    | T
    | {
          [K in string]: TreeOf<T, KeyType>
      }
