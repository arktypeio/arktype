import {
    DiffSetsResult,
    isDigits,
    List,
    StringifyPossibleTypes,
    toString,
    uncapitalize
} from "@re-/tools"
import { ExtractableDefinition } from "./internal.js"
import { Base } from "./nodes/base.js"

export type ParseErrorMessage<Message extends string = string> =
    `Error: ${Message}`

export class ParseError extends Error {
    constructor(definition: unknown, path: string[], description: string) {
        super(buildErrorMessage(definition, path, description))
    }
}

export const stringifyDefinition = (def: unknown) =>
    toString(def, { quotes: "none", maxNestedStringLength: 50 })

export const stringifyPathContext = (path: string[], trailingSpace = false) =>
    path.length ? ` at path ${path.join("/")}${trailingSpace ? " " : ""}` : ""

/** Description should start with a verb, e.g. "is of invalid type 'function'" or "contains a shallow cycle" */
export const buildErrorMessage = (
    definition: unknown,
    path: string[],
    description: string
) =>
    `Definition ${stringifyDefinition(definition)}${stringifyPathContext(
        path
    )} ${description}.`

export const definitionTypeErrorTemplate =
    "Values of type 'function' or 'symbol' are not valid definitions."

export type DefinitionTypeError = typeof definitionTypeErrorTemplate

export type UnknownTypeError<Definition extends string = "your definition"> =
    `Unable to determine the type of ${Definition extends "your definition"
        ? Definition
        : `'${Definition}'`}.`

export const unknownTypeError = <Definition>(def: Definition, path: string[]) =>
    `Unable to determine the type of '${stringifyDefinition(
        def
    )}'${stringifyPathContext(path)}.`

// Members of a union type to errors that occurred validating those types
export type SplittableErrors = Record<string, string>

export interface SplittableErrorArgs extends BaseAssignmentArgs {
    delimiter: "|" | "&"
    errors: SplittableErrors
    verbose: boolean
}

export const splittableValidationError = ({
    def,
    valueType,
    errors,
    delimiter,
    verbose
}: SplittableErrorArgs) =>
    `${stringifyDefinition(valueType)} is not assignable to ${
        delimiter === "|" ? "any" : "all"
    } of ${stringifyDefinition(def)}.${
        verbose ? "\n" + stringifyErrors(errors) : ""
    }`

export interface BaseParseArgs {
    def: unknown
    ctx: Base.ParseContext
}

export type ShallowCycleError<
    Def extends string = string,
    Seen extends string = string
> = `${Def} references a shallow cycle: ${StringifyPossibleTypes<Seen>}.`

export const shallowCycleError = ({ def, ctx }: BaseParseArgs) =>
    `${stringifyDefinition(def)} references a shallow cycle: ${[
        ...ctx.seen,
        def
    ].join("=>")}.`

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

export interface BaseAssignmentArgs<
    DefType = unknown,
    AssignmentType = ExtractableDefinition
> {
    def: DefType
    valueType: AssignmentType
}

export const requiredCycleErrorTemplate =
    `Unable to generate a default value for type including a required cycle:\n@cycle\n` +
    `If you'd like to avoid throwing in when this occurs, pass a value to return ` +
    `when this occurs to the 'onRequiredCycle' option.`

export const isRequiredCycleError = (value: unknown) =>
    typeof value === "string" &&
    value.match(requiredCycleErrorTemplate.replace("@cycle", ".*"))

export const generateRequiredCycleError = ({
    def,
    ctx: { seen }
}: BaseParseArgs) =>
    requiredCycleErrorTemplate.replace("@cycle", [...seen, def].join("=>"))

export class UngeneratableError extends Error {
    constructor(def: string, defType: string) {
        super(ungeneratableError(def, defType))
    }
}

export const ungeneratableError = (def: string, defType: string) =>
    `Unable to generate a value for '${def}' (${defType} generation is unsupported).`

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
    `Could not find a default value satisfying ${stringifyDefinition(
        def
    )}${stringifyPathContext(path)}.`

export const duplicateSpaceError =
    "Space has already been determined according to the source of this 'model' method."

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
    return `Encountered errors at the following paths:\n${toString(errors, {
        indent: 2
    })}`
}
