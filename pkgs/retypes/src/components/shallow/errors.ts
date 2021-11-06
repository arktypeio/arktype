import { stringify, StringReplace } from "@re-do/utils"
import { UnvalidatedShallowDefinition } from "../common.js"

export const stringifyDefinition = (definition: unknown) =>
    stringify(definition, { quotes: "none" })

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringifyDefinition(definition)} ${
        path.length ? `at path ${path.join("/")} ` : ""
    }is invalid. ${baseDefinitionTypeError}`

export const baseDefinitionTypeError =
    "Definitions must be strings, numbers, or objects."

export type DefinitionTypeError = typeof baseDefinitionTypeError

export const baseUnknownTypeError =
    "Unable to determine the type of '${definition}'."

export type UnknownTypeError<
    Definition extends UnvalidatedShallowDefinition = UnvalidatedShallowDefinition
> = StringReplace<typeof baseUnknownTypeError, "${definition}", `${Definition}`>

export const unknownTypeError = <Definition>(definition: Definition) =>
    baseUnknownTypeError.replace("${definition}", String(definition))
