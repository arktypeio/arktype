import { throwInternalError } from "../../errors.js"
import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { Contradiction } from "./contradiction.js"

const baseStringOperations = {
    extract: <t extends string>(a: t, b: t) => (a === b ? a : null),
    exclude: <t extends string>(a: t, b: t) => (a === b ? null : a)
}

export const type = defineOperations<Attribute<"type">>()({
    ...baseStringOperations,
    intersect: (a, b) =>
        a === b
            ? a
            : new Contradiction(`types ${a} and ${b} are mutually exclusive`)
})

export const value = defineOperations<Attribute<"value">>()({
    ...baseStringOperations,
    intersect: (a, b) =>
        a === b
            ? a
            : new Contradiction(`values ${a} and ${b} are mutually exclusive`)
})

export const alias = defineOperations<Attribute<"alias">>()({
    ...baseStringOperations,
    intersect: (a, b) =>
        throwInternalError(
            `Unexpected attempt to intersect aliases '${a}' and '${b}'`
        )
})
