import {
    diffSets,
    DiffSetsResult,
    filterChars,
    isAlphaNumeric,
    isRecursible,
    stringify,
    transform,
    TreeOf,
    uncapitalize
} from "@re-do/utils"
import {
    ExtractableTypeName,
    extractableTypes,
    formatTypes,
    FunctionDefinition,
    UnextractableTypeName,
    unextractableTypes,
    UnvalidatedDefinition,
    UnvalidatedObjectDefinition,
    UnvalidatedTypeSet
} from "./common.js"
import { definitionTypeError, unknownTypeError } from "./errors.js"

export type ExtractedDefinition = TreeOf<ExtractableTypeName, string | number>

export const typeOf = (value: any): ExtractedDefinition => {
    if (typeof value === "boolean") {
        return value ? "true" : "false"
    }
    if (typeof value === "object") {
        if (value === null) {
            return "null"
        }
        return transform(value, ([k, v]) => [k, typeOf(v)])
    }
    return typeof value as ExtractableTypeName
}

// Validation errors or undefined if there are none
export type ValidationResult = ValidationErrors | undefined

export const assert = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {},
    options: ValidateOptions = {}
) => {
    const errorMessage = checkErrors(value, definedType, typeSet, options)
    if (errorMessage) {
        throw new Error(errorMessage)
    }
}

export const defaultValidateOptions: Required<ValidateOptions> = {
    ignoreExtraneousKeys: false
}

export type ValidateOptions = {
    ignoreExtraneousKeys?: boolean
}

export const checkErrors = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {},
    options: ValidateOptions = {}
) => stringifyErrors(errorsAtPaths(value, definedType, typeSet, options))

export const stringifyErrors = (errors: ValidationErrors) => {
    const errorPaths = Object.keys(errors)
    if (errorPaths.length === 0) {
        return ""
    }
    if (errorPaths.length === 1) {
        const errorPath = errorPaths[0]
        return `${errorPath ? `At path '${errorPath}', ` : ""}${
            errorPath ? uncapitalize(errors[errorPath]) : errors[errorPath]
        }`
    }
    return stringify(errors)
}

export const errorsAtPaths = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {},
    options: ValidateOptions = {}
) =>
    validate({
        extracted: typeOf(value),
        defined: formatTypes(definedType),
        path: [],
        seen: [],
        typeSet,
        ...defaultValidateOptions,
        ...options
    })

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export const getBaseTypeName = (definition: string) =>
    filterChars(definition, isAlphaNumeric)

// Members of an or type to errors that occurred validating those types
export type OrTypeErrors = Record<string, string>

export const orValidationError = (
    { defined, extracted }: RecurseArgs,
    orTypeErrors: OrTypeErrors
) =>
    `'${stringify(
        extracted
    )}' is not assignable to any of '${defined}':\n${stringify(orTypeErrors)}`

export const unassignableError = ({ extracted, defined }: RecurseArgs) =>
    `Extracted type '${stringify(
        extracted
    )}' is not assignable to defined type '${stringify(defined)}'.`

export const shallowCycleError = ({ defined, seen, typeSet }: RecurseArgs) =>
    `'${stringify(defined)}' shallowly references itself ` +
    `in typeSet '${stringify(
        typeSet
    )}' via the following set of resolutions: ${seen.join("=>")}.`

export const isAFunctionDefinition = <D extends string>(definition: D) =>
    /\(.*\)\=\>.*/.test(definition) as D extends FunctionDefinition
        ? true
        : false

export type RecurseArgs<
    Defined = UnvalidatedDefinition,
    Extracted = ExtractedDefinition
> = Required<ValidateOptions> & {
    extracted: Extracted
    defined: Defined
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
}

const tupleLengthError = ({ defined, extracted }: RecurseArgs) =>
    `Tuple of length ${extracted.length} is not assignable to defined tuple of length ${defined.length}.`

const mismatchedKeysError = (keyErrors: DiffSetsResult<string>) => {
    const missing = keyErrors?.removed?.length
        ? `Required keys ${keyErrors.removed.join(", ")} were missing.`
        : ""
    const extraneous = keyErrors?.added?.length
        ? `Keys ${keyErrors.added.join(", ")} were unexpected.`
        : ""
    return `${missing}${missing && extraneous ? " " : ""}${extraneous}`
}

const validationError = (message: string, path: string[]) => ({
    [path.join("/")]: message
})

/**
 * Throw if and only if a definition is invalid and unparsable.
 * Otherwise, return a map of unassignable paths to their error messages
 * (meaning the empty object indicates a valid assignment).
 */
export const validate = (args: RecurseArgs): ValidationErrors => {
    const findMatchingValidator = (
        startingValidator: RecursiveValidator<any>
    ): Validator<any> => {
        if ("validate" in startingValidator) {
            return startingValidator
        }
        for (const candidate of startingValidator.delegate()) {
            if (candidate.when(args)) {
                return findMatchingValidator(candidate)
            }
        }
        return startingValidator.fallback(args)
    }
    const validator = findMatchingValidator(rootValidator)
    return validator.validate(args)
}

const rootValidator: RecursiveValidator<unknown> = {
    when: () => true,
    delegate: () => [stringValidator, objectValidator],
    fallback: (args) => {
        throw new Error(definitionTypeError(args.defined, args.path))
    }
}

const stringValidator: RecursiveValidator<unknown, string> = {
    when: ({ defined }) => typeof defined === "string",
    delegate: () => [
        optionalValidator,
        orValidator,
        functionValidator,
        listValidator,
        definedTypeValidator,
        unextractableTypeValidator,
        extractableTypeValidator
    ],
    fallback: ({ defined }) => {
        throw new Error(unknownTypeError(defined))
    }
}

const objectValidator: RecursiveValidator<
    unknown,
    UnvalidatedObjectDefinition
> = {
    when: ({ defined }) => isRecursible(defined),
    delegate: () => [tupleValidator, nontupleValidator],
    fallback: ({ defined, path }) => {
        throw new Error(definitionTypeError(defined, path))
    }
}

const optionalValidator: RecursiveValidator<string> = {
    when: ({ defined }) => defined.endsWith("?"),
    validate: (args) => {
        if (args.extracted === "undefined") {
            return {}
        }
        return validate({ ...args, defined: args.defined.slice(0, -1) })
    }
}

const orValidator: RecursiveValidator<string> = {
    when: ({ defined }) => defined.includes("|"),
    validate: (args) => {
        const orTypes = args.defined.split("|")
        const orTypeErrors: OrTypeErrors = {}
        for (const orType of orTypes) {
            const validationResult = stringifyErrors(
                validate({
                    ...args,
                    defined: orType
                })
            )
            if (!validationResult) {
                // If one of the or types doesn't return any errors, the whole type is valid
                return {}
            }
            orTypeErrors[orType] = validationResult
        }
        // If we make it out of the for loop without returning, none of the or types are valid
        return validationError(orValidationError(args, orTypeErrors), args.path)
    }
}

const functionValidator: RecursiveValidator<string> = {
    when: ({ defined }) => isAFunctionDefinition(defined),
    validate: (args) => {
        if (args.extracted === "function") {
            return {}
        }
        return validationError(unassignableError(args), args.path)
    }
}

const listValidator: RecursiveValidator<string> = {
    when: ({ defined }) => defined.endsWith("[]"),
    validate: (args) => {
        const listItemDefinition = args.defined.slice(0, -2)
        if (Array.isArray(args.extracted)) {
            // Convert the defined list to a tuple of the same length as extracted
            return validate({
                ...args,
                defined: [...Array(args.extracted.length)].map(
                    () => listItemDefinition
                )
            })
        }
        return validationError(unassignableError(args), args.path)
    }
}

const definedTypeValidator: RecursiveValidator<string> = {
    when: ({ defined, typeSet }) => defined in typeSet,
    validate: (args) => {
        /**
         * Keep track of definitions we've seen since last resolving to an object or built-in.
         * If we encounter the same definition twice, we're dealing with a shallow cyclic typeSet
         * like {user: "person", person: "user"}.
         **/
        if (args.seen.includes(args.defined)) {
            throw new Error(shallowCycleError(args))
        }
        // If defined refers to a new type in typeSet, start resolving its definition
        return validate({
            ...args,
            defined: args.typeSet[args.defined],
            seen: [...args.seen, args.defined]
        })
    }
}

const unextractableTypeValidator: RecursiveValidator<
    string,
    UnextractableTypeName
> = {
    when: ({ defined }) => defined in unextractableTypes,
    validate: (args) => {
        const unextractableTypeAssignabilityMap: {
            [K in UnextractableTypeName]: (
                extracted: ExtractedDefinition
            ) => boolean
        } = {
            any: () => true,
            unknown: () => true,
            boolean: (_) => _ === "true" || _ === "false",
            object: (_) => typeof _ === "object",
            void: (_) => _ === "undefined",
            never: (_) => false
        }
        if (unextractableTypeAssignabilityMap[args.defined](args.extracted)) {
            return {}
        }
        return validationError(unassignableError(args), args.path)
    }
}

const extractableTypeValidator: RecursiveValidator<
    string,
    ExtractableTypeName
> = {
    when: ({ defined }) => defined in extractableTypes,
    validate: (args) =>
        args.extracted === args.defined
            ? {}
            : validationError(unassignableError(args), args.path)
}

const tupleValidator: RecursiveValidator<UnvalidatedObjectDefinition, any[]> = {
    when: ({ defined }) => Array.isArray(defined),
    validate: (args) => {
        if (!Array.isArray(args.extracted)) {
            // Defined is a tuple, extracted is an object with string keys (will never be assignable)
            return validationError(unassignableError(args), args.path)
        }
        if (args.defined.length !== args.extracted.length) {
            return validationError(tupleLengthError(args), args.path)
        }
        return validateProperties(args)
    }
}

const nontupleValidator: RecursiveValidator<
    UnvalidatedObjectDefinition,
    Record<string, any>
> = {
    when: ({ defined }) => !Array.isArray(defined),
    validate: (args) => {
        const { defined, extracted, ignoreExtraneousKeys, path } = args
        if (Array.isArray(args.extracted)) {
            // Defined is an object with string keys, extracted is a tuple (will never be assignable)
            return validationError(unassignableError(args), args.path)
        }
        // Neither type is a tuple, validate keys as a set
        const keyDiff = diffSets(Object.keys(defined), Object.keys(extracted))
        const keyErrors = keyDiff
            ? Object.entries(keyDiff).reduce((diff, [k, v]) => {
                  if (k === "added" && !ignoreExtraneousKeys) {
                      return { ...diff, added: v }
                  }
                  if (k === "removed") {
                      // Omit keys defined optional from 'removed'
                      const illegallyRemoved = v.filter(
                          (removedKey) =>
                              typeof defined[removedKey] !== "string" ||
                              !defined[removedKey].endsWith("?")
                      )
                      return illegallyRemoved.length
                          ? { ...diff, removed: illegallyRemoved }
                          : diff
                  }
                  return diff
              }, undefined as DiffSetsResult<string>)
            : undefined
        if (keyErrors) {
            return validationError(mismatchedKeysError(keyErrors), path)
        }
        return validateProperties(args)
    }
}

/**
 * Recurse into the properties of two objects/tuples with
 * keysets that have already been validated as compatible.
 */
const validateProperties = ({
    defined,
    extracted,
    typeSet,
    path,
    ignoreExtraneousKeys
}: RecurseArgs<UnvalidatedObjectDefinition>) => {
    return Object.keys(defined)
        .filter((definedKey) => definedKey in (extracted as object))
        .reduce<ValidationErrors>(
            (errors, mutualKey) => ({
                ...errors,
                ...validate({
                    extracted: (extracted as any)[mutualKey],
                    defined: (defined as any)[mutualKey],
                    path: [...path, mutualKey],
                    typeSet,
                    seen: [],
                    ignoreExtraneousKeys
                })
            }),
            {}
        )
}

export type RecursiveValidator<Checked, Validated = Checked> =
    | Validator<Checked, Validated>
    | Delegator<Checked, Validated>

export type Validator<Checked, Validated = Checked> = {
    when: (args: RecurseArgs<Checked>) => boolean
    validate: (args: RecurseArgs<Validated>) => ValidationErrors
}

export type Delegator<Checked, Validated = Checked> = {
    when: (args: RecurseArgs<Checked>) => boolean
    delegate: () => RecursiveValidator<Validated, any>[]
    fallback: (args: RecurseArgs<Validated>) => any
}
