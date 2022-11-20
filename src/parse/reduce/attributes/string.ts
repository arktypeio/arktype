import { throwInternalError } from "../../errors.js"
import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"
import { Contradiction } from "./contradiction.js"

const excludeString = <t extends string>(a: t, b: t) => (a === b ? null : a)

export const type = defineOperations<Attribute<"type">>()({
    intersect: (a, b) =>
        a === b
            ? a
            : new Contradiction(`types ${a} and ${b} are mutually exclusive`),
    exclude: excludeString
})

export const value = defineOperations<Attribute<"value">>()({
    intersect: (a, b) =>
        a === b
            ? a
            : new Contradiction(`values ${a} and ${b} are mutually exclusive`),
    exclude: excludeString
})

export const alias = defineOperations<Attribute<"alias">>()({
    intersect: (a, b) =>
        throwInternalError(
            `Unexpected attempt to intersect aliases '${a}' and '${b}'`
        ),
    exclude: excludeString
})
