import {
    DiffSetsResult,
    List,
    stringify,
    StringReplace,
    uncapitalize,
    isDigits,
    filterChars,
    isAlphaNumeric,
    Join,
    StringifyPossibleTypes
} from "@re-do/utils"
import { ExtractableDefinition } from "./common.js"
import { ParseContext } from "./parser.js"
import { Shallow } from "./shallow/shallow.js"

export const stringifyDefinition = (definition: unknown) =>
    stringify(definition, { quotes: "none" })

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringifyDefinition(definition)} ${
        path.length ? `at path ${path.join("/")} ` : ""
    }is invalid. ${definitionTypeErrorTemplate}`

export const definitionTypeErrorTemplate =
    "Definitions must be strings, numbers, or objects."

export type DefinitionTypeError = typeof definitionTypeErrorTemplate

export const getBaseTypeName = (definition: string) =>
    filterChars(definition, isAlphaNumeric)

export const baseUnknownTypeError = "Unable to determine the type of '@def'."

export type UnknownTypeError<
    Definition extends Shallow.Definition = Shallow.Definition
> = StringReplace<typeof baseUnknownTypeError, "@def", `${Definition}`>

export const unknownTypeError = <Definition>(def: Definition) =>
    baseUnknownTypeError.replace("@def", String(def))

// Members of an or type to errors that occurred validating those types
export type OrTypeErrors = Record<string, string>

export type OrErrorArgs = BaseAssignmentArgs & { orErrors: OrTypeErrors }

export const orValidationErrorTemplate =
    "@valueType is not assignable to any of @def:\n@errors"

export const orValidationError = ({ def, valueType, orErrors }: OrErrorArgs) =>
    orValidationErrorTemplate
        .replace("@valueType", stringifyDefinition(valueType))
        .replace("@def", stringify(def))
        .replace("@errors", stringify(orErrors))

export type BaseParseArgs = {
    def: unknown
    ctx: ParseContext<unknown>
}

export const shallowCycleErrorTemplate =
    "@def shallowly references itself in typeSet @typeSet via the following set of resolutions: @resolutions."

export type ShallowCycleError<
    Def extends string = string,
    TypeSet = any,
    Seen = any
> = StringReplace<
    StringReplace<
        StringReplace<typeof shallowCycleErrorTemplate, "@def", Def>,
        "@typeSet",
        ""
    >,
    "@resolutions",
    StringifyPossibleTypes<keyof Seen & string>
>

export type ValidationErrorMessage =
    | UnknownTypeError
    | ShallowCycleError
    | DefinitionTypeError

export type InferrableValidationErrorMessage<E> =
    E extends ValidationErrorMessage ? E : never

export const shallowCycleError = ({ def, ctx }: BaseParseArgs) =>
    shallowCycleErrorTemplate
        .replace("@def", stringifyDefinition(def))
        .replace("@typeSet", stringify(ctx.typeSet))
        .replace("@resolutions", [...ctx.seen, def].join("=>"))

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
