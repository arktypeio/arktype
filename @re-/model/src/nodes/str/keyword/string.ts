import { Func, isAlpha, isAlphaNumeric } from "@re-/tools"
import { StringLiteral } from "../embeddedLiteral/stringLiteral.js"
import { defineKeywords, listKeywords } from "./common.js"

const emailRegex = /^(.+)@(.+)$/

const validateLiteral = (
    valueType: unknown,
    validate: Func<[string], boolean>
) => typeof valueType === "string"
// &&
// StringLiteral.matches(valueType) &&
// validate(StringLiteral.valueFrom(valueType))

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
    },
    character: {
        generate: () => "a",
        validate: (valueType) =>
            validateLiteral(valueType, (value) => value.length === 1)
    }
})

export const stringKeywords = listKeywords(stringHandlers)
