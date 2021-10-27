import { stringify, StringReplace } from "@re-do/utils"

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringify(definition)} at path ${path.join(
        "/"
    )} is invalid. ${baseDefinitionTypeError}`

export const baseDefinitionTypeError = "Definitions must be strings or objects."

export type DefinitionTypeError = typeof baseDefinitionTypeError

export const baseUnknownTypeError =
    "Unable to determine the type of '${definition}'."

export type UnknownTypeError<Definition extends string = string> =
    StringReplace<typeof baseUnknownTypeError, "${definition}", Definition>

export const unknownTypeError = <Definition extends string>(
    definition: Definition
) => baseUnknownTypeError.replace("${definition}", definition)
