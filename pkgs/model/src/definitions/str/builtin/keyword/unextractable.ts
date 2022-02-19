import { valueGenerationError } from "../internal.js"
import { defineKeywords, listKeywords } from "./internal.js"

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
        allows: () => true
    },
    unknown: {
        generate: () => undefined as unknown,
        allows: () => true
    },
    void: {
        generate: () => undefined as void,
        allows: (valueType) => valueType === "undefined"
    },
    never: {
        generate: ({ def, ctx }) => {
            throw new Error(valueGenerationError({ def, ctx }))
        },
        allows: () => false
    },
    // Narrowable types
    object: {
        generate: () => ({} as object),
        allows: (valueType) => typeof valueType === "object"
    },
    boolean: {
        generate: () => false as boolean,
        allows: (valueType) => valueType === "true" || valueType === "false"
    },
    string: {
        generate: () => "" as string,
        allows: (valueType) =>
            typeof valueType === "string" && !!valueType.match("'.*'")
    },
    // These types are extracted as primitives to avoid type widening
    // that occurs when inferring a number from a template string
    number: {
        generate: () => 0 as number,
        allows: (valueType) => typeof valueType === "number"
    },
    bigint: {
        generate: () => BigInt(0),
        allows: (valueType) => typeof valueType === "bigint"
    }
})

export const unextractableKeywords = listKeywords(unextractableHandlers)

export type UnextractableKeyword = keyof typeof unextractableHandlers
