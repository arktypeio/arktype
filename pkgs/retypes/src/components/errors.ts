import { DiffSetsResult, List, stringify, StringReplace } from "@re-do/utils"
import {
    ExtractableDefinition,
    stringifyDefinition,
    UnvalidatedTypeSet
} from "./common.js"
import { AllowsOptions, ParseArgs, ParseContext } from "./parser.js"
import { Shallow } from "./shallow/shallow.js"

export const baseUnknownTypeError =
    "Unable to determine the type of '${definition}'."

export type UnknownTypeError<
    Definition extends Shallow.Definition = Shallow.Definition
> = StringReplace<typeof baseUnknownTypeError, "${definition}", `${Definition}`>

export const unknownTypeError = <Definition>(definition: Definition) =>
    baseUnknownTypeError.replace("${definition}", String(definition))

// Members of an or type to errors that occurred validating those types
export type OrTypeErrors = Record<string, string>

export type OrErrorArgs = BaseAssignmentArgs & { orErrors: OrTypeErrors }

export const orValidationError = ({
    definition,
    assignment,
    orErrors
}: OrErrorArgs) =>
    `${stringifyDefinition(
        assignment
    )} is not assignable to any of ${definition}:\n${stringify(orErrors)}`

export type ShallowCycleErrorArgs = BaseAssignmentArgs & ParseContext<unknown>

export const shallowCycleError = ({
    definition,
    typeSet,
    seen
}: ShallowCycleErrorArgs) =>
    `${stringifyDefinition(definition)} shallowly references itself ` +
    `in typeSet ${stringify(typeSet)} via the following set of resolutions: ${[
        ...seen,
        definition
    ].join("=>")}.`

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
    definition: DefType
    assignment: AssignmentType
}

export const unassignableError = ({
    definition,
    assignment
}: BaseAssignmentArgs) =>
    `${stringifyDefinition(
        assignment
    )} is not assignable to ${stringifyDefinition(definition)}.`

export const tupleLengthError = ({
    definition,
    assignment
}: BaseAssignmentArgs<List, List>) =>
    `Tuple of length ${assignment.length} is not assignable to tuple of length ${definition.length}.`

export const mismatchedKeysError = (keyErrors: DiffSetsResult<string>) => {
    const missing = keyErrors?.removed?.length
        ? `Required keys '${keyErrors.removed.join(", ")}' were missing.`
        : ""
    const extraneous = keyErrors?.added?.length
        ? `Keys '${keyErrors.added.join(", ")}' were unexpected.`
        : ""
    return `${missing}${missing && extraneous ? " " : ""}${extraneous}`
}
