import {
    diffSets,
    isEmpty,
    isRecursible,
    transform,
    TreeOf
} from "@re-do/utils"
import {
    ExtractableDefinition,
    ExtractableDefinitionMap,
    formatTypes,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "./common.js"

export type ExtractedDefinition = TreeOf<ExtractableDefinition, string | number>

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
    return typeof value as ExtractableDefinition
}

const validateStringOrObject = (value: any) => {
    const valueType = typeof value
    if (!["string", "object"].includes(valueType)) {
        throw new Error(
            `${value} of type ${valueType} is not a valid definition. Expected a string or object.`
        )
    }
}

const unassignableErrorMessage = (
    extractedType: ExtractedDefinition,
    definedType: UnvalidatedDefinition
) =>
    `Extracted type '${stringify(
        extractedType
    )}' is not assignable to defined type '${stringify(definedType)}'.`

// Validation errors or undefined if there are none
export type ValidationResult = ValidationErrors | undefined

export const assert = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {}
) => {
    const errorMessage = validate(value, definedType, typeSet)
    if (errorMessage) {
        throw new Error(errorMessage)
    }
}

export const validate = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {}
) => {
    const errors = validateRecurse(
        typeOf(value),
        formatTypes(definedType),
        "",
        typeSet
    )
    const errorPaths = Object.keys(errors)
    if (errorPaths.length === 0) {
        return undefined
    }
    if (errorPaths.length === 1) {
        const errorPath = errorPaths[0]
        return `Validation error${
            errorPath ? ` at path '${errorPath}'` : ""
        }: ${errors[errorPath]}`
    }
    return `Multiple validation errors: ${stringify(errors)}`
}

export const errorsAtPaths = (
    value: unknown,
    definedType: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {}
) => validateRecurse(typeOf(value), formatTypes(definedType), "", typeSet)

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

const extractableDefinitions: ExtractableDefinitionMap = {
    bigint: BigInt(0),
    string: "",
    true: true,
    false: false,
    number: 0,
    null: null,
    symbol: Symbol(),
    undefined: undefined,
    function: () => {}
}

export const validateRecurse = (
    extractedType: ExtractedDefinition,
    definedType: UnvalidatedDefinition,
    path: string,
    typeSet: UnvalidatedTypeSet
): ValidationErrors => {
    validateStringOrObject(extractedType)
    validateStringOrObject(definedType)
    if (definedType === "any") {
        return {}
    }
    if (typeof extractedType === "object") {
        if (definedType === "object") {
            return {}
        }
        let resolvedDefinition = definedType
        const seen: Record<string, true> = {}
        while (typeof resolvedDefinition !== "object") {
            if (resolvedDefinition in seen) {
                return {
                    [path]: `Unable to resolve shallow cyclic type ${definedType}.`
                }
            }
            if (resolvedDefinition.endsWith("[]")) {
                if (!Array.isArray(extractedType)) {
                    return {
                        [path]: unassignableErrorMessage(
                            extractedType,
                            resolvedDefinition
                        )
                    }
                }
                const resolvedItemDefinition = resolvedDefinition.slice(0, -2)
                // Validate the extracted list by converting the array type to a tuple of the same length
                // as the extracted type
                resolvedDefinition = [
                    ...Array(extractedType.length).map(
                        (_) => resolvedItemDefinition
                    )
                ]
                break
                // TODO: This needs to handle individual components, or/list etc.
            } else if (resolvedDefinition in typeSet) {
                seen[resolvedDefinition] = true
                resolvedDefinition = typeSet[resolvedDefinition]
            } else {
                return {
                    [path]: unassignableErrorMessage(extractedType, definedType)
                }
            }
        }
        return validateObject(extractedType, resolvedDefinition, path, typeSet)
    } else if (extractedType in extractableDefinitions) {
        if (typeof definedType !== "string") {
            // No extractable string type is assignable to a defined object type
            return {
                [path]: unassignableErrorMessage(extractedType, definedType)
            }
        }
        return shallowvalidate(extractedType, definedType, path, typeSet)
    } else {
        return { [path]: `Unexpected extracted definition ${extractedType}.` }
    }
}

export const validateObject = (
    extractedType: ExtractedDefinition & object,
    definedType: UnvalidatedDefinition & object,
    path: string,
    typeSet: UnvalidatedTypeSet
): ValidationErrors => {
    if (Array.isArray(extractedType) !== Array.isArray(definedType)) {
        // One type is an array, the other is an object with string keys (will never be assignable)
        return {
            [path]: unassignableErrorMessage(extractedType, definedType)
        }
    } else if (Array.isArray(extractedType)) {
        // Both types are arrays, validate numeric keys
        if (definedType.length !== extractedType.length) {
            return {
                [path]: `List ${extractedType} of length ${extractedType.length} is not assignable to list ${definedType} of length ${definedType.length}.`
            }
        }
    } else {
        // Neither type is an array, valid string keys
        const keyDiff = diffSets(
            Object.keys(definedType),
            Object.keys(extractedType)
        )
        if (keyDiff) {
            // TODO: Handle optionals
            return {
                [path]: `Keys do not match between extracted type (${stringify(
                    extractedType
                )}) and defined type (${stringify(
                    definedType
                )}). Discrepancies:\n${stringify(keyDiff)}`
            }
        }
    }
    // For either an array or map, recurse for each value
    return Object.entries(extractedType).reduce<ValidationErrors>(
        (errors, [k, extractedDefinition]) => ({
            ...errors,
            ...validateRecurse(
                extractedDefinition,
                (definedType as any)[k],
                path ? `${path}/${k}` : k,
                typeSet
            )
        }),
        {}
    )
}

export const stringify = (value: any) =>
    isRecursible(value) ? JSON.stringify(value, null, 4) : String(value)

export const shallowvalidate = (
    extractedType: ExtractedDefinition & string,
    definedType: UnvalidatedDefinition & string,
    path: string,
    typeSet: UnvalidatedTypeSet
): ValidationErrors => {
    if (extractedType === definedType) return {}
    if (["true", "false"].includes(extractedType) && definedType === "boolean")
        return {}
    if (extractedType === "function" && /\(.*\)\=\>.*/.test(definedType))
        return {}
    return { [path]: unassignableErrorMessage(extractedType, definedType) }
}
