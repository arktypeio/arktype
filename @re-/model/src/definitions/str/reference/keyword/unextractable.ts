import { defineKeywords, valueGenerationError } from "./internal.js"
import { numberHandlers } from "./number.js"
import { stringHandlers } from "./string.js"

/**
 * These types can be used to specify a type definition but
 * will never be used to represent a valueType at runtime, either
 * because they are abstract type constructs (e.g. "never") or
 * because a more specific type will always be extracted (e.g.
 * "boolean", which will always evaluate as "true" or "false")
 */
export const unextractableHandlers = defineKeywords({
    // Abstract types
    any: {
        generate: () => undefined as any,
        validate: () => true
    },
    unknown: {
        generate: () => undefined as unknown,
        validate: () => true
    },
    void: {
        generate: () => undefined as void,
        validate: (valueType) => valueType === "undefined"
    },
    never: {
        generate: ({ def, ctx }) => {
            throw new Error(valueGenerationError({ def, ctx }))
        },
        validate: () => false
    },
    // Narrowable types
    object: {
        generate: () => ({} as object),
        validate: (valueType) => typeof valueType === "object"
    },
    boolean: {
        generate: () => false as boolean,
        validate: (valueType) => valueType === "true" || valueType === "false"
    },
    ...stringHandlers,
    /*
     * These types are extracted as primitives to avoid type widening
     * that occurs when inferring a number from a template string
     */
    ...numberHandlers,
    bigint: {
        generate: () => BigInt(0),
        validate: (valueType) => typeof valueType === "bigint"
    }
})
