import { DiffSetsResult, List, stringify, StringReplace } from "@re-do/utils"
import {
    ExtractableDefinition,
    stringifyDefinition,
    UnvalidatedTypeSet
} from "./common.js"
import { AllowsOptions, ParseArgs, ParseContext } from "./parser.js"
import { Shallow } from "./shallow/shallow.js"

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
