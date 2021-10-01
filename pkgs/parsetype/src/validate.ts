import { transform, TreeOf } from "@re-do/utils"
import {
    ExtractableDefinition,
    ExtractableDefinitionMap,
    UnvalidatedDefinition
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

const extractableDefinitions: ExtractableDefinitionMap = {
    bigint: 0n,
    string: "",
    true: true,
    false: false,
    number: 0,
    null: null,
    symbol: Symbol(),
    undefined: undefined,
    function: () => {}
}

const validateStringOrObject = (value: any) => {
    const valueType = typeof value
    if (!["string", "object"].includes(valueType)) {
        throw new Error(
            `${value} of type ${valueType} is not a valid definition. Expected a string or object.`
        )
    }
}

const throwUnassignableError = (
    extractedType: ExtractedDefinition,
    definedType: UnvalidatedDefinition
) => {
    throw new Error(
        `Extracted type ${JSON.stringify(
            extractedType
        )} is not assignable to defined type ${JSON.stringify(definedType)}.`
    )
}

export const satisfies = (
    extractedType: ExtractedDefinition,
    definedType: UnvalidatedDefinition
): any => {
    validateStringOrObject(extractedType)
    validateStringOrObject(definedType)
    if (typeof definedType === "object") {
        if (Array.isArray(definedType)) {
            if (!Array.isArray(extractedType)) {
                throwUnassignableError(extractedType, definedType)
            }
            if (definedType.length !== extractedType.length) {
                throw new Error(
                    `List ${extractedType} of length ${extractedType.length} is not assignable to list ${definedType} of length ${definedType.length}.`
                )
            }
            definedType.forEach((definition, index) =>
                satisfies(
                    extractedType[index] as ExtractedDefinition,
                    definition
                )
            )
        }

        return Object.values(definedType)
    }
    // if ([])
    //     if (typeof definedType === "string") {
    //     } else if (typeof definedType === "object") {
    //     } else {
    //     }
}
