import {
    DiffSetsResult,
    List,
    stringify,
    StringReplace,
    uncapitalize,
    isDigits,
    filterChars,
    isAlphaNumeric
} from "@re-do/utils"
import { ExtractableDefinition } from "./common.js"
import { ParseContext } from "./parser.js"
import { Shallow } from "./shallow/shallow.js"

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

export const baseUnknownTypeError = "Unable to determine the type of '${def}'."

export type UnknownTypeError<
    Definition extends Shallow.Definition = Shallow.Definition
> = StringReplace<typeof baseUnknownTypeError, "${def}", `${Definition}`>

export const unknownTypeError = <Definition>(def: Definition) =>
    baseUnknownTypeError.replace("${def}", String(def))

// Members of an or type to errors that occurred validating those types
export type OrTypeErrors = Record<string, string>

export type OrErrorArgs = BaseAssignmentArgs & { orErrors: OrTypeErrors }

export const orValidationError = ({ def, valueType, orErrors }: OrErrorArgs) =>
    `${stringifyDefinition(
        valueType
    )} is not assignable to any of ${def}:\n${stringify(orErrors)}`

export type BaseParseArgs = {
    def: unknown
    ctx: ParseContext<unknown>
}

export const shallowCycleError = ({ def, ctx }: BaseParseArgs) =>
    `${stringifyDefinition(def)} shallowly references itself ` +
    `in typeSet ${stringify(
        ctx.typeSet
    )} via the following set of resolutions: ${[...ctx.seen, def].join("=>")}.`

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ValidationErrorArgs = { path: string[] } & (
    | { message: string }
    | BaseAssignmentArgs
)

export const validationError = (args: ValidationErrorArgs) => ({
    [args.path.join("/")]:
        "message" in args ? args.message : unassignableError(args)
})

export type BaseAssignmentArgs<
    DefType = unknown,
    AssignmentType = ExtractableDefinition
> = {
    def: DefType
    valueType: AssignmentType
}

export const unassignableError = ({ def, valueType }: BaseAssignmentArgs) =>
    `${stringifyDefinition(
        valueType
    )} is not assignable to ${stringifyDefinition(def)}.`

export const tupleLengthError = ({
    def,
    valueType
}: BaseAssignmentArgs<List, List>) =>
    `Tuple of length ${valueType.length} is not assignable to tuple of length ${def.length}.`

export const mismatchedKeysError = (keyErrors: DiffSetsResult<string>) => {
    const missing = keyErrors?.removed?.length
        ? `Required keys '${keyErrors.removed.join(", ")}' were missing.`
        : ""
    const extraneous = keyErrors?.added?.length
        ? `Keys '${keyErrors.added.join(", ")}' were unexpected.`
        : ""
    return `${missing}${missing && extraneous ? " " : ""}${extraneous}`
}

export const valueGenerationError = ({ def, ctx: { path } }: BaseParseArgs) =>
    `Could not find a default value satisfying ${stringifyDefinition(def)}${
        path.length ? ` at '${path.join("/")}'` : ""
    }.`

export const stringifyErrors = (errors: ValidationErrors) => {
    const errorPaths = Object.keys(errors)
    if (errorPaths.length === 0) {
        return ""
    }
    if (errorPaths.length === 1) {
        const errorPath = errorPaths[0]
        return `${
            errorPath
                ? `At ${isDigits(errorPath) ? "index" : "path"} ${errorPath}, `
                : ""
        }${errorPath ? uncapitalize(errors[errorPath]) : errors[errorPath]}`
    }
    return stringify(errors)
}
