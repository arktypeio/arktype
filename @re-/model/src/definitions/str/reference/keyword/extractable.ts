import { defineKeywords } from "./internal.js"

// These are the named types we can extract from a valueType at runtime
export const extractableHandlers = defineKeywords({
    /*
     * Values of these types cannot be meaningfully compared,
     * so they are extracted at the 'typeof' level
     */
    symbol: {
        generate: () => Symbol(),
        validate: (valueType) => valueType === "symbol"
    },
    function: {
        generate: () => {
            throw new Error(`Generation of functions is not supported.`)
        },
        validate: (valueType) => valueType === "function"
    },
    /*
     * These can be represented via their respective primitives,
     * but are extracted as literals for clarity
     */
    true: {
        generate: () => true as const,
        validate: (valueType) => valueType === "true"
    },
    false: {
        generate: () => false as const,
        validate: (valueType) => valueType === "false"
    },
    undefined: {
        generate: () => undefined,
        validate: (valueType) => valueType === "undefined"
    },
    null: {
        generate: () => null,
        validate: (valueType) => valueType === "null"
    }
})

export type ExtractableKeyword = keyof typeof extractableHandlers
