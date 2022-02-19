import { defineKeywords, listKeywords } from "./internal.js"
import validator from "validator"

export const stringHandlers = defineKeywords({
    string: {
        generate: () => "" as string,
        allows: (valueType) =>
            typeof valueType === "string" && !!valueType.match("'.*'")
    },
    email: {
        generate: () => "david@redo.dev",
        allows: (valueType) =>
            typeof valueType === "string" && validator.isEmail(valueType)
    }
})

export const stringKeywords = listKeywords(stringHandlers)

export type StringKeyword = keyof typeof stringHandlers
