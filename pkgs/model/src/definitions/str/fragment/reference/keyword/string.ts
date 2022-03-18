import validator from "validator"
import { defineKeywords, listKeywords } from "./internal.js"
import { StringLiteral } from "../literal/stringLiteral.js"
import { Func } from "@re-/tools"

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
        allows: (valueType) => validateLiteral(valueType, () => true)
    },
    email: {
        generate: () => "david@redo.dev",
        allows: (valueType) => validateLiteral(valueType, validator.isEmail)
    },
    alpha: {
        generate: () => "",
        allows: (valueType) => validateLiteral(valueType, validator.isAlpha)
    },
    alphanumeric: {
        generate: () => "",
        allows: (valueType) =>
            validateLiteral(valueType, validator.isAlphanumeric)
    },
    lowercase: {
        generate: () => "",
        allows: (valueType) => validateLiteral(valueType, validator.isLowercase)
    },
    uppercase: {
        generate: () => "",
        allows: (valueType) => validateLiteral(valueType, validator.isLowercase)
    }
})

export const stringKeywords = listKeywords(stringHandlers)

export type StringKeyword = keyof typeof stringHandlers
