import { defineKeywords, listKeywords } from "./internal.js"
import { StringLiteral } from "../literal/stringLiteral.js"
import { Func, isAlpha, isAlphaNumeric } from "@re-/tools"

// From https://emailregex.com/
const emailRegex =
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

const validateLiteral = (
    valueType: unknown,
    validate: Func<[string], boolean>
) =>
    typeof valueType === "string" &&
    StringLiteral.matches(valueType) &&
    validate(StringLiteral.valueFrom(valueType))

export const stringHandlers = defineKeywords({
    string: {
        generate: () => "",
        validate: (valueType) => validateLiteral(valueType, () => true)
    },
    email: {
        generate: () => "david@redo.dev",
        validate: (valueType) =>
            validateLiteral(valueType, (value) => emailRegex.test(value))
    },
    alpha: {
        generate: () => "",
        validate: (valueType) => validateLiteral(valueType, isAlpha)
    },
    alphanumeric: {
        generate: () => "",
        validate: (valueType) => validateLiteral(valueType, isAlphaNumeric)
    },
    lowercase: {
        generate: () => "",
        validate: (valueType) =>
            validateLiteral(valueType, (value) => value === value.toLowerCase())
    },
    uppercase: {
        generate: () => "",
        validate: (valueType) =>
            validateLiteral(valueType, (value) => value === value.toUpperCase())
    }
})

export const stringKeywords = listKeywords(stringHandlers)

export type StringKeyword = keyof typeof stringHandlers
