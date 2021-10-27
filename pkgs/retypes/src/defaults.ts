import { transform, stringify, narrow } from "@re-do/utils"
import {
    BuiltInTypeName,
    formatTypes,
    UnvalidatedDefinition,
    UnvalidatedTypeSet,
    isAFunctionDefinition
} from "./common.js"
import { definitionTypeError } from "./errors.js"

// These values can be directly compared for equality
export const comparableDefaultValues = narrow({
    undefined: undefined,
    any: undefined,
    unknown: undefined,
    void: undefined,
    null: null,
    false: false,
    true: true,
    boolean: false,
    number: 0,
    string: "",
    bigint: BigInt(0)
})

export const comparableDefaultValueSet = [
    undefined,
    null,
    false,
    true,
    0,
    "",
    BigInt(0)
]

export const nonComparableDefaultValues = narrow({
    object: {},
    symbol: Symbol(),
    function: (...args: any[]) => undefined as any,
    never: undefined as never
})

// Default values for each built in type, sorted by precedence
export const builtInDefaultValues: { [K in BuiltInTypeName]: any } = {
    ...comparableDefaultValues,
    ...nonComparableDefaultValues
}

export type GetDefaultOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

export const getDefault = (
    definition: UnvalidatedDefinition,
    typeSet: UnvalidatedTypeSet = {},
    options: GetDefaultOptions = {}
): any => {
    const throwOnRequiredCycle = !("onRequiredCycle" in options)
    const recurse = (
        subdefinition: UnvalidatedDefinition,
        path: string[],
        seen: string[]
    ): any => {
        const errorAtPath = `Could not find a default value satisfying ${stringify(
            subdefinition
        )}${path.length ? ` at '${path.join("/")}'` : ""}.`
        if (typeof subdefinition === "string") {
            if (subdefinition.endsWith("?")) {
                return undefined
            }
            if (subdefinition.includes("|")) {
                const orTypes = subdefinition.split("|")
                const possibleValues = orTypes.map((orType) =>
                    recurse(orType, path, seen)
                )
                for (const comparableValue of comparableDefaultValueSet) {
                    if (possibleValues.includes(comparableValue)) {
                        return comparableValue
                    }
                }
                for (const valueType in nonComparableDefaultValues) {
                    const matchingValue = possibleValues.find(
                        (value) => typeof value === valueType
                    )
                    if (matchingValue) {
                        return matchingValue
                    }
                }
                // The only type that should get to this point without returning is a custom
                // value from returnOnCycle, so just return the first one
                return possibleValues[0]
            }
            if (isAFunctionDefinition(subdefinition)) {
                return builtInDefaultValues["function"]
            }
            if (subdefinition.endsWith("[]")) {
                return []
            }
            if (subdefinition in typeSet) {
                if (seen.includes(subdefinition)) {
                    if (throwOnRequiredCycle) {
                        throw new Error(
                            `Unable to generate a default value for type including a required cycle:\n${[
                                ...seen,
                                subdefinition
                            ].join("=>")}.` +
                                `If you'd like to avoid throwing in when this occurs, pass a value to return ` +
                                `when this occurs to the 'onRequiredCycle' option.`
                        )
                    }
                    return options.onRequiredCycle
                }
                return recurse(typeSet[subdefinition], path, [
                    ...seen,
                    subdefinition
                ])
            }
            if (subdefinition in builtInDefaultValues) {
                if (subdefinition === "never") {
                    throw new Error(errorAtPath)
                }
                return builtInDefaultValues[subdefinition as BuiltInTypeName]
            }
            throw new Error(errorAtPath)
        }
        if (typeof subdefinition === "object") {
            if (Array.isArray(subdefinition)) {
                return subdefinition.map((itemDefinition, index) =>
                    recurse(itemDefinition, [...path, `${index}`], seen)
                )
            }
            return Object.fromEntries(
                Object.entries(subdefinition)
                    .filter(
                        ([k, propertyDefinition]) =>
                            typeof propertyDefinition !== "string" ||
                            !propertyDefinition.endsWith("?")
                    )
                    .map(([k, propertyDefinition]) => [
                        k,
                        recurse(propertyDefinition, [...path, k], seen)
                    ])
            )
        }
        throw new Error(definitionTypeError(subdefinition, path))
    }
    return recurse(formatTypes(definition), [], [])
}
