import { DiffSetsResult, List, stringify } from "@re-do/utils"
import { ExtractableDefinition, stringifyDefinition } from "./common.js"
import { AllowsAssignmentArgs } from "./component.js"

// Members of an or type to errors that occurred validating those types
export type OrTypeErrors = Record<string, string>

export const orValidationError = (
    { definition, from }: AllowsAssignmentArgs,
    orTypeErrors: OrTypeErrors
) =>
    `${stringifyDefinition(
        from
    )} is not assignable to any of ${definition}:\n${stringify(orTypeErrors)}`

export const shallowCycleError = ({
    definition,
    seen,
    typeSet
}: AllowsAssignmentArgs) =>
    `${stringifyDefinition(definition)} shallowly references itself ` +
    `in typeSet ${stringify(typeSet)} via the following set of resolutions: ${[
        ...seen,
        definition
    ].join("=>")}.`

export const validationError = (message: string, path: string[]) => ({
    [path.join("/")]: message
})

export const unassignableError = ({ definition, from }: AllowsAssignmentArgs) =>
    `${stringifyDefinition(from)} is not assignable to ${stringifyDefinition(
        definition
    )}.`

export const tupleLengthError = ({
    definition,
    from
}: AllowsAssignmentArgs<List, List<ExtractableDefinition>>) =>
    `Tuple of length ${from.length} is not assignable to tuple of length ${definition.length}.`

export const mismatchedKeysError = (keyErrors: DiffSetsResult<string>) => {
    const missing = keyErrors?.removed?.length
        ? `Required keys '${keyErrors.removed.join(", ")}' were missing.`
        : ""
    const extraneous = keyErrors?.added?.length
        ? `Keys '${keyErrors.added.join(", ")}' were unexpected.`
        : ""
    return `${missing}${missing && extraneous ? " " : ""}${extraneous}`
}
