import { defineKeywords, listKeywords } from "./internal.js"

export const numberHandlers = defineKeywords({
    number: {
        generate: () => 0,
        allows: (valueType) => typeof valueType === "number"
    },
    integer: {
        generate: () => 0,
        allows: (valueType) => Number.isInteger(valueType)
    },
    positive: {
        generate: () => 1,
        allows: (valueType) => typeof valueType === "number" && valueType > 0
    },
    negative: {
        generate: () => -1,
        allows: (valueType) => typeof valueType === "number" && valueType < 0
    },
    nonPositive: {
        generate: () => 0,
        allows: (valueType) => typeof valueType === "number" && valueType <= 0
    },
    nonNegative: {
        generate: () => 0,
        allows: (valueType) => typeof valueType === "number" && valueType >= 0
    }
})

export const numberKeywords = listKeywords(numberHandlers)

export type NumberKeyword = keyof typeof numberHandlers
