import { Recursible } from "@re-do/utils"
import { stringify } from "@re-do/utils"

export * as Root from "./root.js"

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

export const stringifyDefinition = (definition: unknown) =>
    stringify(definition, { quotes: "none" })

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringifyDefinition(definition)} ${
        path.length ? `at path ${path.join("/")} ` : ""
    }is invalid. ${baseDefinitionTypeError}`

export const baseDefinitionTypeError =
    "Definitions must be strings, numbers, or objects."

export type DefinitionTypeError = typeof baseDefinitionTypeError
