import { defineKeywords, listKeywords } from "./internal.js"

// These are the named types we can extract from a valueType at runtime
export const extractableHandlers = defineKeywords({
    // Values of these types cannot be meaningfully compared,
    // so they are extracted at the 'typeof' level
    symbol: {
        generate: () => Symbol(),
        allows: (valueType) => valueType === "symbol"
    },
    function: {
        generate:
            () =>
            (...args: any[]) =>
                undefined as any,
        allows: (valueType) => valueType === "function"
    },
    // These can be represented via their respective primitives,
    // but are extracted as literals for clarity
    true: {
        generate: () => true as true,
        allows: (valueType) => valueType === "true"
    },
    false: {
        generate: () => false as false,
        allows: (valueType) => valueType === "false"
    },
    undefined: {
        generate: () => undefined,
        allows: (valueType) => valueType === "undefined"
    },
    null: {
        generate: () => null,
        allows: (valueType) => valueType === "null"
    }
})

export const extractableKeywords = listKeywords(extractableHandlers)

export type ExtractableKeyword = keyof typeof extractableHandlers
