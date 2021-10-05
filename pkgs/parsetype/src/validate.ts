import {
    diffSets,
    DiffSetsResult,
    filterChars,
    FilterFunction,
    isAlphaNumeric,
    isEmpty,
    isRecursible,
    stringify,
    transform,
    TreeOf,
    uncapitalize
} from "@re-do/utils"
import {
    ExtractableTypeName,
    extractableTypes,
    ExtractableTypes,
    formatTypes,
    FunctionDefinition,
    UnextractableTypeName,
    unextractableTypes,
    UnvalidatedDefinition,
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
    const errorMessage = validate(value, definedType, typeSet, options)
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

export const validate = (
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
    validateRecurse({
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

export type RecurseArgs = Required<ValidateOptions> & {
    extracted: ExtractedDefinition
    defined: UnvalidatedDefinition
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

/**
 * Throw if and only if a definition is invalid and unparsable.
 * Otherwise, return a map of unassignable paths to their error messages
 * (meaning the empty object indicates a valid assignment).
 */
export const validateRecurse = (args: RecurseArgs): ValidationErrors => {
    const { extracted, defined, path, typeSet, seen, ignoreExtraneousKeys } =
        args
    const pathKey = path.join("/")
    const unassignable = { [pathKey]: unassignableError(args) }
    if (typeof defined === "string") {
        if (defined.endsWith("?")) {
            if (extracted === "undefined") {
                return {}
            }
            return validateRecurse({ ...args, defined: defined.slice(0, -1) })
        }
        if (defined.includes("|")) {
            const orTypes = defined.split("|")
            const orTypeErrors: OrTypeErrors = {}
            for (const orType of orTypes) {
                const validationResult = stringifyErrors(
                    validateRecurse({
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
            return { [pathKey]: orValidationError(args, orTypeErrors) }
        }
        if (isAFunctionDefinition(defined)) {
            if (extracted === "function") {
                return {}
            }
            return unassignable
        }
        if (defined.endsWith("[]")) {
            const listItemDefinition = defined.slice(0, -2)
            if (Array.isArray(extracted)) {
                // Convert the defined list to a tuple of the same length as extracted
                return validateRecurse({
                    ...args,
                    defined: [...Array(extracted.length)].map(
                        () => listItemDefinition
                    )
                })
            }
            return unassignable
        }
        if (defined in typeSet) {
            /**
             * Keep track of definitions we've seen since last resolving to an object or built-in.
             * If we encounter the same definition twice, we're dealing with a shallow cyclic typeSet
             * like {user: "person", person: "user"}.
             **/
            if (seen.includes(defined)) {
                throw new Error(shallowCycleError(args))
            }
            // If defined refers to a new type in typeSet, start resolving its definition
            return validateRecurse({
                ...args,
                defined: typeSet[defined],
                seen: [...seen, defined]
            })
        }
        if (defined in unextractableTypes) {
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
            if (
                unextractableTypeAssignabilityMap[
                    defined as UnextractableTypeName
                ](extracted)
            ) {
                return {}
            }
            return unassignable
        }
        if (defined in extractableTypes) {
            return extracted === defined ? {} : unassignable
        }
        throw new Error(unknownTypeError(defined))
    } else if (isRecursible(defined)) {
        if (Array.isArray(defined) !== Array.isArray(extracted)) {
            // One type is an array, the other is an object with string keys (will never be assignable)
            return unassignable
        } else if (Array.isArray(defined)) {
            // Both types are arrays, validate numeric keys
            if (defined.length !== extracted.length) {
                return {
                    [pathKey]: tupleLengthError(args)
                }
            }
        } else {
            // Neither type is an array, validate keys as a set
            const keyDiff = diffSets(
                Object.keys(defined),
                Object.keys(extracted)
            )
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
                return { [pathKey]: mismatchedKeysError(keyErrors) }
            }
        }
        /**
         * If we've made it to this point, extracted's keyset is valid.
         * Recurse into mutual keys to validate their values.
         */
        return Object.keys(extracted)
            .filter((extractedKey) => extractedKey in defined)
            .reduce<ValidationErrors>(
                (errors, mutualKey) => ({
                    ...errors,
                    ...validateRecurse({
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
    throw new Error(definitionTypeError(defined, path))
}
