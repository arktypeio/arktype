import { Recursible } from "@re-do/utils"

export type ParseTypeRecurseOptions = Required<ParseTypeOptions>

export type ParseTypeOptions = {
    onCycle?: UnvalidatedDefinition
    seen?: any
    deepOnCycle?: boolean
    onResolve?: UnvalidatedDefinition
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export type UnvalidatedShallowDefinition = string | number

export type UnvalidatedDefinition =
    | UnvalidatedShallowDefinition
    | UnvalidatedRecursibleDefinition

export type UnvalidatedRecursibleDefinition<Def = any> =
    Def extends Recursible<Def>
        ? {
              [K in string | number]: any
          }
        : never

export type OptionalDefinition<Def extends string = string> = `${Def}?`
