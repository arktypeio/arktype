import { defineKeywords, listKeywords } from "./internal.js"

export const numberHandlers = defineKeywords({
    number: {
        generate: () => 0,
        validate: (valueType) => typeof valueType === "number"
    },
    integer: {
        generate: () => 0,
        validate: (valueType) => Number.isInteger(valueType)
    },
    positive: {
        generate: () => 1,
        validate: (valueType) => typeof valueType === "number" && valueType > 0
    },
    nonnegative: {
        generate: () => 0,
        validate: (valueType) => typeof valueType === "number" && valueType >= 0
    }
})

export const numberKeywords = listKeywords(numberHandlers)

export type NumberKeyword = keyof typeof numberHandlers
