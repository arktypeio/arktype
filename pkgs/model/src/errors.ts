import {
    DiffSetsResult,
    List,
    toString,
    StringReplace,
    uncapitalize,
    isDigits,
    filterChars,
    isAlphaNumeric,
    StringifyPossibleTypes
} from "@re-/tools"
import { ParseContext } from "./definitions/parser.js"
import { ModifierToken } from "./definitions/str/modifier/internal.js"
import { ExtractableDefinition } from "./internal.js"

export const stringifyDefinition = (def: unknown) =>
    toString(def, { quotes: "none" })

export const definitionTypeError = (definition: unknown, path: string[]) =>
    `Definition value ${stringifyDefinition(definition)}${stringifyPathContext(
        path,
        true
    )}is invalid. ${definitionTypeErrorTemplate}`

export const stringifyPathContext = (
    path: string[],
    trailingSpace: boolean = false
) =>
    path.length ? ` at path ${path.join("/")}${trailingSpace ? " " : ""}` : ""

export const definitionTypeErrorTemplate =
    "Values of type 'function' or 'symbol' are not valid definitions."

export type DefinitionTypeError = typeof definitionTypeErrorTemplate

export const getBaseTypeName = (definition: string) =>
    filterChars(definition, isAlphaNumeric)

export const baseUnknownTypeError =
    "Unable to determine the type of '@def'@context."

export type UnknownTypeError<Definition extends string = string> =
    StringReplace<
        StringReplace<typeof baseUnknownTypeError, "@def", `${Definition}`>,
        "@context",
        ""
    >

export const unknownTypeError = <Definition>(def: Definition, path: string[]) =>
    baseUnknownTypeError
        .replace("@def", stringifyDefinition(def))
        .replace("@context", stringifyPathContext(path))

export const duplicateModifierErrorTemplate =
    "Modifier '@modifier' cannot appear more than once in a string definition."

export const duplicateModifierError = (modifier: ModifierToken) =>
    duplicateModifierErrorTemplate.replace("@modifier", modifier)

export type DuplicateModifierError<
    DuplicatedModifier extends ModifierToken = ModifierToken
> = StringReplace<
    typeof duplicateModifierErrorTemplate,
    "@modifier",
    `${DuplicatedModifier}`
>

export const invalidModifierErrorTemplate =
    "Modifier '@modifier' is only valid at the end of a type definition before any constraints."

export const invalidModifierError = (modifier: ModifierToken) =>
    invalidModifierErrorTemplate.replace("@modifier", modifier)

export type InvalidModifierError<
    InvalidModifier extends ModifierToken = ModifierToken
> = StringReplace<
    typeof invalidModifierErrorTemplate,
    "@modifier",
    `${InvalidModifier}`
>

// Members of a union type to errors that occurred validating those types
export type SplittableErrors = Record<string, string>

export type SplittableErrorArgs = BaseAssignmentArgs & {
    delimiter: "|" | "&"
    errors: SplittableErrors
}

export const splittableValidationErrorTemplate =
    "@valueType is not assignable to @components of @def:\n@errors"

export const splittableValidationError = ({
    def,
    valueType,
    errors,
    delimiter
}: SplittableErrorArgs) =>
    splittableValidationErrorTemplate
        .replace("@valueType", stringifyDefinition(valueType))
        .replace("@components", delimiter === "|" ? "any" : "all")
        .replace("@def", stringifyDefinition(def))
        .replace("@errors", stringifyErrors(errors))

export type BaseParseArgs = {
    def: unknown
    ctx: ParseContext
}

export const shallowCycleErrorTemplate =
    "@def references a shallow cycle: @resolutions."

export type ShallowCycleError<
    Def extends string = string,
    Seen extends string = string
> = StringReplace<
    StringReplace<typeof shallowCycleErrorTemplate, "@def", Def>,
    "@resolutions",
    StringifyPossibleTypes<Seen>
>

export const shallowCycleError = ({ def, ctx }: BaseParseArgs) =>
    shallowCycleErrorTemplate
        .replace("@def", stringifyDefinition(def))
        .replace("@space", stringifyDefinition(ctx.space))
        .replace("@resolutions", [...ctx.seen, def].join("=>"))

export const invalidLimitErrorTemplate =
    "@limit cannot be used to bound @inner."

export type InvalidLimitError<
    Inner extends string = string,
    Limit extends string = string
> = StringReplace<
    StringReplace<typeof invalidLimitErrorTemplate, "@inner", Inner>,
    "@limit",
    Limit
>

export const invalidLimitError = (inner: string, limit: string) =>
    invalidLimitErrorTemplate
        .replace("@inner", stringifyDefinition(inner))
        .replace("@limit", stringifyDefinition(limit))

export const unboundableErrorTemplate =
    "Bounded definition @inner must be a number or string."

export type UnboundableError<Inner extends string = string> = StringReplace<
    typeof unboundableErrorTemplate,
    "@inner",
    Inner
>

export const unboundableError = (inner: string) =>
    unboundableErrorTemplate.replace("@inner", stringifyDefinition(inner))

export type ValidationErrorMessage =
    | UnknownTypeError
    | ShallowCycleError
    | DefinitionTypeError
    | DuplicateModifierError
    | InvalidModifierError
    | InvalidLimitError
    | UnboundableError

export type InferrableValidationErrorMessage<E> =
    E extends ValidationErrorMessage ? E : never

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
    return toString(errors)
}
